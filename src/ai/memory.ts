import { prisma } from "@/lib/prisma";
import { createSummary } from "@/ai/openai";
import { logError } from "@/lib/logger";

const SUMMARY_AFTER = Number(process.env.CONVERSATION_SUMMARY_AFTER ?? 24);

export type MemoryFacts = {
  name?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  product_interest?: string | null;
  current_provider?: string | null;
  budget?: string | null;
  objections?: string[];
  offers_presented?: string[];
  last_offer?: string | null;
  current_stage?: string | null;
  important_facts?: string;
};

export async function refreshConversationMemory(conversationId: string, patch: MemoryFacts = {}) {
  const conv = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      lead: { include: { facts: true, objections: true } },
      memory: true,
      messages: { orderBy: { createdAt: "desc" }, take: 40 },
    },
  });

  const facts: MemoryFacts = {
    name: conv.lead.name,
    city: conv.lead.city,
    neighborhood: conv.lead.neighborhood,
    product_interest: conv.lead.productInterest,
    current_stage: conv.salesStage,
    objections: conv.lead.objections.map((o) => o.category),
    ...(typeof conv.memory?.customerFacts === "object" && conv.memory?.customerFacts
      ? (conv.memory.customerFacts as MemoryFacts)
      : {}),
    ...patch,
  };

  let summary = conv.memory?.summary ?? null;
  let lastSummarizedMessageId = conv.memory?.lastSummarizedMessageId ?? null;
  const chronological = [...conv.messages].reverse();
  if (chronological.length >= SUMMARY_AFTER) {
    try {
      const blob = chronological
        .map((m) => `${m.actor}: ${m.body}`)
        .join("\n")
        .slice(0, 8000);
      summary = await createSummary(
        `Fatos: ${JSON.stringify(facts)}\nResumo anterior: ${summary ?? "—"}\nMensagens:\n${blob}`,
      );
      lastSummarizedMessageId = chronological.at(-1)?.id ?? null;
    } catch (error) {
      logError("memory.summary_failed", { conversationId, message: String(error) });
    }
  }

  await prisma.conversationMemory.upsert({
    where: { conversationId },
    create: {
      conversationId,
      summary,
      customerFacts: facts as object,
      lastSummarizedMessageId,
    },
    update: {
      summary: summary ?? undefined,
      customerFacts: facts as object,
      lastSummarizedMessageId,
    },
  });
  return facts;
}
