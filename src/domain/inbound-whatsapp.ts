import { prisma } from "@/lib/prisma";
import type { ParsedWhatsAppEvent } from "@/integrations/whatsapp/parse";
import { sanitizeEventMetadata } from "@/integrations/whatsapp/parse";
import { findOrCreateWhatsAppContact } from "@/domain/whatsapp-contact";
import { MessageBufferService } from "@/domain/message-buffer";
import { logInfo } from "@/lib/logger";

export async function applyInboundWhatsAppEvent(event: ParsedWhatsAppEvent) {
  if (event.kind === "status") {
    const status =
      event.status === "read"
        ? "READ"
        : event.status === "delivered"
          ? "DELIVERED"
          : event.status === "failed"
            ? "FAILED"
            : "SENT";
    await prisma.message.updateMany({
      where: { OR: [{ waMessageId: event.providerEventId }, { providerMessageId: event.providerEventId }, { wamid: event.providerEventId }] },
      data: { status },
    });
    logInfo("whatsapp.status", { status, errorCode: event.errorCode });
    return { kind: "status" as const };
  }

  if (!event.from) return { kind: "ignored" as const };
  const { conversation } = await findOrCreateWhatsAppContact(event.from);

  const existing = await prisma.message.findFirst({
    where: { OR: [{ waMessageId: event.providerEventId }, { idempotencyKey: event.providerEventId }] },
  });
  if (existing) {
    return { kind: "duplicate" as const, conversationId: conversation.id };
  }

  const body = event.text || `[${event.type}]`;
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      actor: "CUSTOMER",
      body,
      waMessageId: event.providerEventId,
      providerMessageId: event.providerEventId,
      wamid: event.wamid ?? event.providerEventId,
      idempotencyKey: event.providerEventId,
      buffered: true,
      status: "RECEIVED",
      mediaType: event.type !== "text" ? event.type : undefined,
      metadata: sanitizeEventMetadata(event),
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastInboundAt: new Date(),
      unreadCount: { increment: 1 },
      version: { increment: 1 },
      waConversationId: conversation.waConversationId ?? event.from,
    },
  });

  await MessageBufferService.schedule(conversation.id);
  logInfo("whatsapp.inbound_persisted", { conversationId: conversation.id, type: event.type });
  return { kind: "message" as const, conversationId: conversation.id };
}
