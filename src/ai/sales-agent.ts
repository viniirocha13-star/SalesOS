import { prisma } from "@/lib/prisma";
import { getLlmProvider, type LlmMessage } from "@/integrations/llm/provider";
import { runTool, SALES_TOOLS } from "@/ai/tools";
import { getWhatsAppProvider } from "@/integrations/whatsapp/provider";
import { emit } from "@/events/bus";

const SYSTEM = `Você é o vendedor virtual da Brisanet no WhatsApp (Brisa Sales AI).
Fale português brasileiro, cordial e consultivo.
Regras absolutas:
- Nunca invente preço, promoção, benefício, cobertura, prazo ou condição.
- Use somente tools para ofertas, viabilidade, FAQ e pré-venda.
- Se a tool não retornar dado confiável, diga que precisa verificar e encaminhe a humano.
- Não altere preço nem crie oferta.
- Coleta cadastral só após aceite e com minimização (nome, endereço, documento se necessário).
- Não afirme viabilidade positiva sem result=VIAVEL e reliable=true.
- Cross-sell/upsell só com ofertas retornadas pelas tools.`;

export async function handleInboundMessage(input: {
  conversationId: string;
  body: string;
  fromChannel?: "SIMULATOR" | "WHATSAPP";
}) {
  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: input.conversationId },
    include: { lead: true, messages: { orderBy: { createdAt: "asc" }, take: 30 } },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      body: input.body,
      status: "RECEIVED",
    },
  });
  await emit("MESSAGE_RECEIVED", conversation.id, { channel: conversation.channel });

  if (conversation.status === "HANDOFF_HUMANO") {
    const notice =
      "Esta conversa está com um atendente humano. A IA não responde automaticamente até a devolução.";
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        body: notice,
        status: "SENT",
      },
    });
    return { reply: notice, blocked: true, provider: getLlmProvider().name };
  }

  const provider = getLlmProvider();
  const history: LlmMessage[] = [
    { role: "system", content: SYSTEM },
    ...conversation.messages.map((m) => ({
      role: m.direction === "INBOUND" ? ("user" as const) : ("assistant" as const),
      content: m.body,
    })),
    { role: "user", content: input.body },
  ];

  let result = await provider.complete({
    messages: history,
    tools: SALES_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
  });

  let lastToolPayload: string | undefined;
  for (const call of result.toolCalls.slice(0, 6)) {
    const payload = await runTool(call.name, call.arguments, {
      leadId: conversation.leadId,
      conversationId: conversation.id,
    });
    lastToolPayload = JSON.stringify(payload);
    await prisma.aIExecution.create({
      data: {
        conversationId: conversation.id,
        leadId: conversation.leadId,
        model: result.model,
        intent: inferIntent(input.body),
        toolName: call.name,
        offerId:
          typeof (payload as { offers?: { id: string }[] }).offers?.[0]?.id === "string"
            ? (payload as { offers: { id: string }[] }).offers[0].id
            : (payload as { preSale?: { offerId: string } }).preSale?.offerId,
        knowledgeSource: (payload as { knowledge_source?: string }).knowledge_source,
        confidence: provider.name === "dev_mock_llm" ? 0.55 : 0.8,
        result: lastToolPayload.slice(0, 4000),
      },
    });
    history.push({ role: "tool", name: call.name, content: lastToolPayload });
  }

  if (result.toolCalls.length) {
    result = await provider.complete({
      messages: history,
      tools: SALES_TOOLS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
    });
  }

  const reply =
    result.content?.trim() ||
    "Vou verificar com as ofertas e regras cadastradas. Se não encontrar informação confiável, encaminho a um humano.";

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      body: reply,
      status: "SENT",
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  if (conversation.channel === "WHATSAPP") {
    const wa = getWhatsAppProvider();
    await wa.sendText(conversation.lead.phone, reply);
  }

  return { reply, provider: provider.name };
}

function inferIntent(text: string) {
  const t = text.toLowerCase();
  if (/preço|plano|oferta/.test(t)) return "buscar_oferta";
  if (/viab|cep|endere/.test(t)) return "viabilidade";
  if (/aceito|fechar/.test(t)) return "aceite";
  if (/humano|atendente/.test(t)) return "handoff";
  return "qualificacao";
}
