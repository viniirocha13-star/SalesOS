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

const FALLBACK_PROMPT = `Você é o vendedor principal desta operação comercial no WhatsApp.

Você não é um chatbot de respostas prontas.

Seu trabalho é compreender o que o cliente realmente quer, interpretar o contexto da conversa e decidir a melhor maneira de conduzir a negociação.

Você possui liberdade para decidir COMO conversar, mas não possui liberdade para alterar fatos comerciais.

Preços, ofertas, promoções, cobertura, elegibilidade, fidelidade, benefícios, regras e status são determinados pelas ferramentas e pelo backend.

Nunca invente nenhum deles.

Interprete objeções em contexto.

Não responda automaticamente à palavra 'caro'.

Procure compreender por que o cliente considera caro e qual comparação ele está fazendo.

Utilize informações que ele já forneceu.

Não repita perguntas.

Não transforme a conversa em interrogatório.

Quando houver objeção, utilize os argumentos permitidos disponibilizados pelo sistema, mas formule sua própria abordagem natural.

Não utilize respostas padronizadas desnecessariamente.

Você pode fazer perguntas, comparar opções elegíveis, destacar benefícios reais e procurar alternativas válidas.

Nunca crie desconto.

Nunca fale mal de concorrentes.

Nunca invente vantagem.

Quando perceber intenção forte de compra, não continue prolongando a negociação desnecessariamente.

Conduza para fechamento.

Após aceite confirmado pelo backend, pare de vender e passe para condução cadastral.

Solicite somente os dados definidos pelo sistema.

Nunca repita dados pessoais sensíveis completos.

Se uma informação não estiver disponível, use uma ferramenta.

Se não houver ferramenta ou informação suficiente, solicite atendimento humano.

Seu objetivo é vender de forma natural, profissional e eficiente, respeitando integralmente as regras comerciais.`;

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

  await persistImpliedFacts(conversation.leadId, conversation.id, input.combinedInbound);
  const started = Date.now();
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

  const prompt = await loadActivePrompt();
  const recent = [...conversation.messages].reverse();
  const history: LlmMessage[] = [
    { role: "system", content: prompt },
    {
      role: "system",
      content: `Contexto comercial estruturado (fatos e limites do backend, não um roteiro):\n${JSON.stringify(commercial.payload)}`,
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
    result = await createSalesResponse({ messages: history, tools, purpose: routed.purpose === "COMPLEX" ? "COMPLEX" : "SALES" });
  } catch (error) {
    logError("orchestrator.openai_failed", { conversationId: conversation.id, message: String(error) });
    await markHumanReview(conversation.id, conversation.leadId, String(error));
    return { reply: null, blocked: true, provider: "openai_error" };
  }

  let loops = 0;
  while (result.toolCalls.length && loops < 6) {
    loops += 1;
    for (const call of result.toolCalls) {
      if (["set_price", "create_discount", "override_eligibility"].includes(call.name)) {
        history.push({ role: "tool", name: call.name, content: JSON.stringify({ error: "ferramenta_proibida" }) });
        continue;
      }
      toolNames.push(call.name);
      const payload = await runTool(call.name, call.arguments, {
        leadId: conversation.leadId,
        conversationId: conversation.id,
      });
      await recordExecution(conversation.id, conversation.leadId, result, call.name, payload);
      history.push({ role: "tool", name: call.name, content: JSON.stringify(payload) });
    }
    result = await createSalesResponse({
      messages: history,
      tools,
      purpose: routed.purpose === "COMPLEX" ? "COMPLEX" : "SALES",
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
      model: result.model || aiModelFor(routed.purpose === "COMPLEX" ? "COMPLEX" : "SALES"),
      latencyMs: Date.now() - started,
      inputTokens: result.usage?.input ?? 0,
      outputTokens: result.usage?.output ?? 0,
      estimatedCostUsd: await estimateCostUsd(result.model || aiModelFor("SALES"), result.usage?.input ?? 0, result.usage?.output ?? 0),
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

  const reply =
    sanitizeReply(result.content) ||
    "Vou conferir nas ofertas aprovadas. Se não tiver informação confiável, te passo pra um atendente.";

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
  return {
    reply,
    blocked: false,
    provider: result.model,
    lab: {
      model: result.model,
      salesStage: fresh.salesStage,
      buyingIntent: commercial.signals.buyingIntent,
      strategy: commercial.strategy,
      tools: toolNames,
      objection: commercial.objection?.category ?? null,
      escalated: Boolean(routed.reason),
    },
  };
}

async function persistImpliedFacts(leadId: string, conversationId: string, text: string) {
  const bill = text.match(/(?:pago|paga|custa|pago hoje)\s*(?:r\$\s*)?(\d{2,4})/i);
  if (bill) {
    await prisma.customerFact.upsert({
      where: { leadId_key: { leadId, key: "current_bill" } },
      update: { value: bill[1] },
      create: { leadId, key: "current_bill", value: bill[1], source: "conversation" },
    });
    await refreshConversationMemory(conversationId, { budget: `R$${bill[1]}` });
  }
  const competitor = text.match(/(?:outra|concorr\w*).{0,28}(?:é|e|de|por)\s*(?:r\$\s*)?(\d{2,4})/i);
  if (competitor) {
    await prisma.customerFact.upsert({
      where: { leadId_key: { leadId, key: "competitor_price" } },
      update: { value: competitor[1] },
      create: { leadId, key: "competitor_price", value: competitor[1], source: "conversation" },
    });
  }
  const city = ["Caucaia", "Fortaleza", "Mossoró", "Natal", "Recife"].find((c) => text.toLowerCase().includes(c.toLowerCase()));
  if (city) {
    await prisma.lead.update({ where: { id: leadId }, data: { city } });
    await prisma.customerFact.upsert({
      where: { leadId_key: { leadId, key: "city" } },
      update: { value: city },
      create: { leadId, key: "city", value: city, source: "conversation" },
    });
  }
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
  result: { model: string; intent?: string; usage?: { input?: number; output?: number } },
  toolName: string | null,
  payload: unknown,
) {
  const inputTokens = result.usage?.input ?? 0;
  const outputTokens = result.usage?.output ?? 0;
  const estimatedCostUsd = await estimateCostUsd(result.model || aiModelFor("SALES"), inputTokens, outputTokens);
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
      estimatedCostUsd,
      result: JSON.stringify(payload).slice(0, 4000),
    },
  });
}

async function markHumanReview(conversationId: string, leadId: string, reason: string) {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { aiEnabled: false, status: "HANDOFF_HUMANO", salesStage: "HUMAN_HANDOFF" },
  });
  await prisma.humanHandoff.create({
    data: { conversationId, reason: "FALHA_REPETIDA_IA", notes: reason.slice(0, 400) },
  });
  await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      actor: "SYSTEM",
      body: "A conversa foi marcada para revisão humana. Um operador assume em seguida.",
      status: "SENT",
    },
  });
  void leadId;
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
