import { prisma } from "@/lib/prisma";
import { applyInboundWhatsAppEvent } from "@/domain/inbound-whatsapp";
import { runSalesOrchestrator } from "@/ai/orchestrator";
import { logInfo } from "@/lib/logger";
import type { ParsedWhatsAppEvent } from "@/integrations/whatsapp/parse";

export async function processWhatsAppEvent(providerEventId: string) {
  const row = await prisma.whatsAppInboundEvent.findUnique({ where: { providerEventId } });
  if (!row) return;
  if (row.processedAt) {
    logInfo("whatsapp.event_duplicate", { providerEventId });
    return;
  }
  const event = row.payload as unknown as ParsedWhatsAppEvent;
  await applyInboundWhatsAppEvent(event);
  await prisma.whatsAppInboundEvent.update({
    where: { providerEventId },
    data: { processedAt: new Date() },
  });
}

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
    inboundVersionAtStart: undefined,
  });
}
