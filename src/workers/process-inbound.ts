import { prisma } from "@/lib/prisma";
import { runSalesOrchestrator } from "@/ai/orchestrator";
import { logInfo } from "@/lib/logger";

export async function processBufferedConversation(conversationId: string) {
  const pending = await prisma.message.findMany({
    where: { conversationId, direction: "INBOUND", buffered: true },
    orderBy: { createdAt: "asc" },
  });
  if (!pending.length) return;

  const combined = pending.map((m) => m.body).join("\n");
  await prisma.message.updateMany({
    where: { id: { in: pending.map((m) => m.id) } },
    data: { buffered: false },
  });

  logInfo("message.buffer_ready", { conversationId, parts: pending.length });
  await runSalesOrchestrator({
    conversationId,
    combinedInbound: combined,
    persistInbound: false,
  });
}
