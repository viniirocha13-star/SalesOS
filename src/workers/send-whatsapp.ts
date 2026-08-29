import { prisma } from "@/lib/prisma";
import { getWhatsAppProvider } from "@/integrations/whatsapp/provider";
import { canSendFreeform } from "@/integrations/whatsapp/policy";
import { logError, logInfo } from "@/lib/logger";

export async function sendWhatsAppMessage(messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: { include: { lead: true } } },
  });
  if (!message) return;
  if (message.providerMessageId && message.status !== "FAILED" && message.status !== "QUEUED" && message.status !== "RECEIVED") {
    return;
  }
  if (message.conversation.channel !== "WHATSAPP") {
    await prisma.message.update({ where: { id: messageId }, data: { status: "SENT" } });
    return;
  }
  const policy = canSendFreeform(message.conversation.lastInboundAt);
  if (!policy.freeform) {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: "FAILED", metadata: { reason: "session_window_expired" } },
    });
    logError("whatsapp.send_blocked_window", { conversationId: message.conversationId });
    return;
  }
  try {
    const wa = getWhatsAppProvider();
    const sent = await wa.sendText(message.conversation.lead.phone, message.body);
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: "SENT",
        providerMessageId: sent.providerMessageId,
        waMessageId: sent.providerMessageId,
        wamid: sent.providerMessageId,
      },
    });
    await prisma.integration.upsert({
      where: { slug: "whatsapp" },
      update: { status: "CONNECTED", lastError: null, testedAt: new Date() },
      create: { slug: "whatsapp", name: "WhatsApp Cloud API", status: "CONNECTED", testedAt: new Date() },
    });
    logInfo("whatsapp.sent", { conversationId: message.conversationId, messageId });
  } catch (error) {
    await prisma.message.update({
      where: { id: messageId },
      data: { status: "FAILED", metadata: { reason: "send_failed" } },
    });
    await prisma.integration.upsert({
      where: { slug: "whatsapp" },
      update: { status: "ERROR", lastError: "send_failed", testedAt: new Date() },
      create: { slug: "whatsapp", name: "WhatsApp Cloud API", status: "ERROR", lastError: "send_failed" },
    });
    logError("whatsapp.send_failed", { conversationId: message.conversationId, messageId });
    throw error;
  }
}
