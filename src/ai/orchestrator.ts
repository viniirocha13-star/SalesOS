import { prisma } from "@/lib/prisma";
import { runTool, SALES_TOOLS } from "@/ai/tools";
import { createSalesResponse, estimateCostUsd } from "@/ai/openai";
import { refreshConversationMemory } from "@/ai/memory";
import { enqueueSendWhatsApp } from "@/workers/queue";
import { withConversationLock } from "@/workers/locks";
import { emit } from "@/events/bus";
import { logError, logInfo } from "@/lib/logger";
import { aiModelFor } from "@/lib/ai-models";
import type { LlmMessage } from "@/integrations/llm/provider";
import type { SalesStage } from "@prisma/client";

const FALLBACK_PROMPT = `Você é a Luna, vendedora digital da operação no WhatsApp.

Personalidade: competente, natural, objetiva. Mensagens curtas. Uma pergunta por vez quando precisar perguntar.

Você decide COMO conversar. Você NÃO decide fatos comerciais.

Preço, promoção, cobertura, prazo, fidelidade, documentação e condição só existem se uma ferramenta ou o estado do lead devolver. Sem isso, não afirme.

Não use roteiro rígido. Interprete a mensagem. Não pergunte o que já está no SalesConversationState. Não repita apresentação. Não empurre produto que o cliente recusou. Sugestão extra só com contexto comercial.

Objeções: use get_objection_context / get_faq e formule com fatos autorizados — nunca uma frase decorada.

Handoff: só request_human_handoff se o cliente pediu humano, regra explícita ou situação realmente insolúvel. Cliente responder não é motivo de pausa.

Após aceite do backend, cadastro um campo por vez (get_required_customer_fields).`;

export async function runSalesOrchestrator(input: {
  conversationId: string;
  combinedInbound: string;
  persistInbound: boolean;
  actorOverride?: "CUSTOMER" | "SYSTEM";
  inboundVersionAtStart?: number;
}) {
  const locked = await withConversationLock(input.conversationId, () => executeOrchestrator(input));
  if (locked === "locked") {
    logInfo("orchestrator.skipped_lock", { conversationId: input.conversationId });
    return { reply: null, blocked: true, provider: "locked" };
  }
  return locked;
}

async function executeOrchestrator(input: {
  conversationId: string;
  combinedInbound: string;
  persistInbound: boolean;
  actorOverride?: "CUSTOMER" | "SYSTEM";
}) {
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: input.conversationId },
    include: {
      lead: { include: { facts: true } },
      memory: true,
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  const versionAtStart = conversation.version;

  if (input.persistInbound) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        actor: input.actorOverride === "SYSTEM" ? "SYSTEM" : "CUSTOMER",
        body: input.combinedInbound,
        status: "RECEIVED",
      },
    });
  }

  const lockedByHuman = !conversation.aiEnabled || conversation.status === "HANDOFF_HUMANO";
  if (lockedByHuman) {
    return { reply: null, blocked: true, provider: "paused" };
  }

  const started = Date.now();
  const { persistExtractedTurn } = await import("@/sales/persist-state");
  let salesState = await persistExtractedTurn({
    conversationId: conversation.id,
    leadId: conversation.leadId,
    text: input.combinedInbound,
    returningCustomer: Boolean(conversation.memory?.summary || conversation.memory?.commercialState),
  });
  const commercial = await (await import("@/commercial/context")).buildCommercialContext(conversation.id, input.combinedInbound);
  const objections = await prisma.objection.count({
    where: { leadId: conversation.leadId, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
  });
  const inbound = input.combinedInbound.toLowerCase();
  const facts = commercial.payload.CustomerFacts as Record<string, unknown>;
  const ownBill = String(facts.current_bill ?? "");
  const mentionedOtherPrice = inbound.match(/(?:outra|concorr|vivo|claro|tim).{0,24}(\d{2,4})/);
  const restatedOwnBill = inbound.match(/(?:pago|paga|custa|minha atual).{0,12}(\d{2,4})/);
  const contradictions = Boolean(
    ownBill && restatedOwnBill?.[1] && restatedOwnBill[1] !== ownBill && restatedOwnBill[1] !== mentionedOtherPrice?.[1],
  );
  const routed = await (await import("@/commercial/complexity-router")).routeComplexity(conversation.id, {
    consecutiveObjections: objections,
    contradictions,
    lowConfidence: false,
    salesRequestedEscalation: /escalar_complexo/.test(inbound),
    longNegotiation: (conversation.messages?.length ?? 0) > 16 && commercial.signals.intent === "OBJECTION",
    indecisive: /n[aã]o sei|talvez|vou ver com|indecis/.test(inbound) && objections >= 2,
    complexComparison: Boolean(ownBill && mentionedOtherPrice && commercial.ranking.alternative_offer && objections >= 2),
    highLossRisk: commercial.signals.buyingIntent === "HIGH" && objections >= 3,
    exceptional: commercial.signals.intent === "COMPLAINT" && /procon|processo|advogad/.test(inbound),
  });

  const { decideNextBestAction, recommendedTools } = await import("@/sales/next-best-action");
  const { compactSalesStateForPrompt } = await import("@/sales/conversation-state");
  const decided = decideNextBestAction(salesState, {
    cityAvailable: commercial.ranking.best_offer ? true : conversation.lead.city ? false : null,
    hasEligibleOffers: Boolean(commercial.ranking.best_offer),
    hasAcceptance: Boolean(commercial.payload.CommercialAcceptance),
    customerAskedHuman: salesState.handoff_required,
    returningCustomer: Boolean(conversation.memory?.summary),
  });
  salesState = { ...salesState, ...decided };
  await prisma.conversationMemory.upsert({
    where: { conversationId: conversation.id },
    create: { conversationId: conversation.id, commercialState: compactSalesStateForPrompt(salesState) as object },
    update: { commercialState: compactSalesStateForPrompt(salesState) as object },
  });

  const prompt = await loadActivePrompt();
  const recent = [...conversation.messages].reverse();
  const history: LlmMessage[] = [
    { role: "system", content: prompt },
    {
      role: "system",
      content: JSON.stringify({
        SalesConversationState: compactSalesStateForPrompt(salesState),
        next_best_action: salesState.next_best_action,
        suggested_tools: recommendedTools(salesState.next_best_action),
        memory_summary: conversation.memory?.summary ?? null,
        do_not_reask: [
          salesState.cidade && "cidade",
          salesState.produto_interesse && "produto_interesse",
          salesState.operadora_atual && "operadora_atual",
          salesState.quantidade_linhas && "quantidade_linhas",
        ].filter(Boolean),
        knowledge_policy:
          "Book + ferramentas. Sem preço/cobertura/prazo no prompt. Consulte search_eligible_offers, check_city_availability, get_product_knowledge, get_faq.",
      }),
    },
    ...recent.map((m) => ({
      role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
      content: m.body,
    })),
  ];
  if (input.persistInbound) history.push({ role: "user", content: input.combinedInbound });

  const tools = SALES_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
  const toolNames: string[] = [];

  let result;
  try {
    result = await createSalesResponse({ messages: history, tools, purpose: "SALES" });
  } catch (error) {
    logError("orchestrator.openai_failed", { conversationId: conversation.id, message: String(error) });
    const reply =
      "Tive uma instabilidade agora. Continuo com o que você já me passou — pode repetir só o que faltou?";
    const outbound = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        actor: "AI",
        body: reply,
        status: conversation.channel === "WHATSAPP" ? "QUEUED" : "SENT",
      },
    });
    if (conversation.channel === "WHATSAPP") {
      await enqueueSendWhatsApp(outbound.id);
    }
    return { reply, blocked: false, provider: "openai_recover", handoff: false };
  }

  let loops = 0;
  while (result.toolCalls.length && loops < 6) {
    loops += 1;
    history.push({
      role: "assistant",
      content: result.content,
      toolCalls: result.toolCalls,
    });
    for (const call of result.toolCalls) {
      if (["set_price", "create_discount", "override_eligibility"].includes(call.name)) {
        history.push({
          role: "tool",
          name: call.name,
          toolCallId: call.id,
          content: JSON.stringify({ error: "ferramenta_proibida" }),
        });
        continue;
      }
      toolNames.push(call.name);
      const payload = await runTool(call.name, call.arguments, {
        leadId: conversation.leadId,
        conversationId: conversation.id,
      });
      await recordExecution(conversation.id, conversation.leadId, result, call.name, payload);
      history.push({
        role: "tool",
        name: call.name,
        toolCallId: call.id,
        content: JSON.stringify(payload),
      });
    }
    result = await createSalesResponse({
      messages: history,
      tools,
      purpose: "SALES",
    });
  }

  await recordExecution(conversation.id, conversation.leadId, result, null, result.content);
  await prisma.commercialDecision.create({
    data: {
      conversationId: conversation.id,
      intent: commercial.signals.intent,
      buyingIntent: commercial.signals.buyingIntent,
      objection: commercial.objection?.category ?? null,
      strategyLabel: commercial.strategy,
      selectedOfferId: commercial.ranking.best_offer?.id ?? null,
      toolCalls: toolNames,
      escalationReason: routed.reason,
      model: result.model || aiModelFor("SALES"),
      latencyMs: Date.now() - started,
      inputTokens: result.usage?.input ?? 0,
      outputTokens: result.usage?.output ?? 0,
      estimatedCostUsd: await estimateCostUsd(
        result.model || aiModelFor("SALES"),
        result.usage?.input ?? 0,
        result.usage?.output ?? 0,
        result.usage?.cached ?? 0,
      ),
    },
  });

  const fresh = await prisma.conversation.findUniqueOrThrow({ where: { id: conversation.id } });
  if (fresh.version > versionAtStart) {
    logInfo("orchestrator.stale_skipped", { conversationId: conversation.id });
    const { MessageBufferService } = await import("@/domain/message-buffer");
    await MessageBufferService.schedule(conversation.id);
    return { reply: null, blocked: false, provider: "requeued" };
  }
  if (!fresh.aiEnabled) {
    return { reply: null, blocked: true, provider: "paused" };
  }

  const replyRaw =
    sanitizeReply(result.content) ||
    "Vou conferir nas ofertas aprovadas. Se não tiver informação confiável, te passo pra um atendente.";
  const { validateCommercialClaims } = await import("@/commercial/claim-validator");
  const { toCustomerOffer } = await import("@/offer-engine/customer-view");
  const presented = [commercial.ranking.best_offer, commercial.ranking.alternative_offer, commercial.ranking.cross_sell]
    .filter(Boolean)
    .map((o) => toCustomerOffer(o!));
  const claims = validateCommercialClaims(replyRaw, presented);
  let reply = replyRaw;
  if (!claims.ok) {
    const best = presented[0];
    reply = best
      ? `${best.name}${best.speedMbps ? `, ${best.speedMbps} Mega` : ""}${
          best.promotionalPriceCents
            ? `, R$ ${(best.promotionalPriceCents / 100).toFixed(2).replace(".", ",")} no valor promocional cadastrado`
            : ""
        }${
          best.futurePriceCents && best.futurePriceCents !== best.promotionalPriceCents
            ? `. Depois do período cadastrado, R$ ${(best.futurePriceCents / 100).toFixed(2).replace(".", ",")}`
            : ""
        }. Sem inventar condição fora do book.`
      : "Não posso afirmar esse detalhe sem estar no book vigente. Posso te mostrar só o que está aprovado.";
  }

  const outbound = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      actor: "AI",
      body: reply,
      status: "QUEUED",
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
  await refreshConversationMemory(conversation.id, {
    current_stage: fresh.salesStage,
    city: conversation.lead.city,
    name: conversation.lead.name,
    product_interest: conversation.lead.productInterest,
  });

  if (conversation.channel === "WHATSAPP") {
    await enqueueSendWhatsApp(outbound.id);
  } else {
    await prisma.message.update({ where: { id: outbound.id }, data: { status: "SENT" } });
  }

  await emit("AI_RESPONSE_REQUESTED", conversation.id, { messageId: outbound.id });
  const { getLlmProvider } = await import("@/integrations/llm/provider");
  return {
    reply,
    blocked: false,
    provider: getLlmProvider().name,
    model: result.model,
    lab: {
      model: result.model,
      salesStage: fresh.salesStage,
      buyingIntent: commercial.signals.buyingIntent,
      strategy: commercial.strategy,
      tools: toolNames,
      objection: commercial.objection?.category ?? null,
      escalated: Boolean(routed.reason),
      salesState,
    },
  };
}

export async function handleInboundMessage(input: {
  conversationId: string;
  body: string;
  fromChannel?: "SIMULATOR" | "WHATSAPP";
}) {
  return runSalesOrchestrator({
    conversationId: input.conversationId,
    combinedInbound: input.body,
    persistInbound: true,
  });
}

async function loadActivePrompt() {
  const row = await prisma.promptVersion.findFirst({
    where: { active: true, prompt: { slug: "sales_system" } },
    orderBy: { version: "desc" },
  });
  return row?.content ?? FALLBACK_PROMPT;
}

function sanitizeReply(text?: string) {
  if (!text) return "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

async function recordExecution(
  conversationId: string,
  leadId: string,
  result: { model: string; intent?: string; usage?: { input?: number; output?: number; cached?: number } },
  toolName: string | null,
  payload: unknown,
) {
  const inputTokens = result.usage?.input ?? 0;
  const outputTokens = result.usage?.output ?? 0;
  const cachedTokens = result.usage?.cached ?? 0;
  const estimatedCostUsd = await estimateCostUsd(
    result.model || aiModelFor("SALES"),
    inputTokens,
    outputTokens,
    cachedTokens,
  );
  await prisma.aIExecution.create({
    data: {
      conversationId,
      leadId,
      model: result.model || aiModelFor("SALES"),
      intent: result.intent,
      toolName,
      purpose: "SALES",
      inputTokens,
      outputTokens,
      cachedTokens,
      estimatedCostUsd,
      result: JSON.stringify(payload).slice(0, 4000),
    },
  });
}

export async function setSalesStage(conversationId: string, to: SalesStage | string, reason: string, actor: string) {
  const allowed = new Set<string>([
    "NEW",
    "GREETING",
    "DISCOVERY",
    "LOCATION_COLLECTION",
    "VIABILITY_CHECK",
    "NEEDS_ANALYSIS",
    "OFFER_SELECTION",
    "OFFER_PRESENTATION",
    "NEGOTIATION",
    "OBJECTION_HANDLING",
    "BUYING_INTENT",
    "COMMERCIAL_ACCEPTANCE",
    "DATA_COLLECTION",
    "PRE_SALE_READY",
    "WAITING_OPERATOR",
    "HUMAN_HANDOFF",
    "LOST",
  ]);
  if (!allowed.has(to)) return prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const conv = await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  if (conv.salesStage === to) return conv;
  await prisma.salesStageHistory.create({
    data: { conversationId, fromStage: conv.salesStage, toStage: to as SalesStage, reason, actor },
  });
  return prisma.conversation.update({ where: { id: conversationId }, data: { salesStage: to as SalesStage } });
}
