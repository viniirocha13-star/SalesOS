import { prisma } from "@/lib/prisma";
import { isOptOutText } from "@/wa/opt-out";
import { audit } from "@/lib/audit";
import { logInfo } from "@/lib/logger";

const WINDOW_HOURS = () => Number(process.env.WHATSAPP_SESSION_WINDOW_HOURS ?? 24);

type StatusEvent = {
  kind: "status";
  wamid?: string;
  status?: string;
  recipient?: string;
  errorCode?: string;
  phoneNumberId?: string;
};

type MessageEvent = {
  kind: "message";
  from?: string;
  text?: string;
  type: string;
  wamid?: string;
  timestamp?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
};

export async function processWebhookEvent(eventId: string) {
  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
  if (!event) return;
  if (event.status === "PROCESSED" || event.status === "IGNORED") return;

  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: { status: "PROCESSING" },
  });

  try {
    const payload = event.payload as MessageEvent | StatusEvent;
    if (event.eventType === "status" || payload.kind === "status") {
      await handleStatus(event.organizationId, payload as StatusEvent);
    } else {
      await handleInbound(event.organizationId, payload as MessageEvent);
    }
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: "PROCESSED", processedAt: new Date(), error: null },
    });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

async function handleStatus(organizationId: string | null, event: StatusEvent) {
  if (!event.wamid) return;
  const message = await prisma.waMessage.findFirst({
    where: {
      providerMessageId: event.wamid,
      ...(organizationId ? { organizationId } : {}),
    },
  });
  if (!message) return;

  const status = (event.status ?? "").toLowerCase();
  const data: {
    status?: "SENT" | "DELIVERED" | "READ" | "FAILED";
    deliveredAt?: Date;
    readAt?: Date;
    failedAt?: Date;
    errorCode?: string;
    errorMessage?: string;
  } = {};

  if (status === "sent") data.status = "SENT";
  if (status === "delivered") {
    data.status = "DELIVERED";
    data.deliveredAt = new Date();
  }
  if (status === "read") {
    data.status = "READ";
    data.readAt = new Date();
    data.deliveredAt = message.deliveredAt ?? new Date();
  }
  if (status === "failed") {
    data.status = "FAILED";
    data.failedAt = new Date();
    data.errorCode = event.errorCode;
    data.errorMessage = "Falha reportada pela Meta";
  }
  if (!data.status) return;

  await prisma.waMessage.update({ where: { id: message.id }, data });

  const recipient = await prisma.waCampaignRecipient.findFirst({
    where: { providerMessageId: event.wamid },
  });
  if (recipient) {
    const rData: Record<string, unknown> = { status: data.status };
    if (data.deliveredAt) rData.deliveredAt = data.deliveredAt;
    if (data.readAt) rData.readAt = data.readAt;
    if (data.failedAt) {
      rData.failedAt = data.failedAt;
      rData.failureCode = event.errorCode;
    }
    await prisma.waCampaignRecipient.update({ where: { id: recipient.id }, data: rData });

    if (data.status === "DELIVERED") {
      await prisma.waCampaign.update({
        where: { id: recipient.campaignId },
        data: { deliveredCount: { increment: 1 } },
      });
    }
    if (data.status === "READ") {
      await prisma.waCampaign.update({
        where: { id: recipient.campaignId },
        data: { readCount: { increment: 1 } },
      });
    }
    if (data.status === "FAILED") {
      await prisma.waCampaign.update({
        where: { id: recipient.campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }
  }
}

async function handleInbound(organizationId: string | null, event: MessageEvent) {
  if (!event.from || !event.phoneNumberId) return;

  const phone = await prisma.phoneNumber.findFirst({
    where: {
      phoneNumberId: event.phoneNumberId,
      ...(organizationId ? { organizationId } : {}),
    },
  });
  if (!phone) {
    logInfo("wa.webhook.unknown_phone", { phoneNumberId: event.phoneNumberId });
    return;
  }

  const orgId = phone.organizationId;
  const phoneE164 = event.from.startsWith("+") ? event.from : `+${event.from.replace(/\D/g, "")}`;

  let contact = await prisma.contact.findUnique({
    where: { organizationId_phoneE164: { organizationId: orgId, phoneE164 } },
  });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        organizationId: orgId,
        phoneE164,
        source: "inbound",
        status: "ACTIVE",
        lastMessageAt: new Date(),
      },
    });
  } else {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date() },
    });
  }

  const inboundAt = event.timestamp ? new Date(Number(event.timestamp) * 1000) : new Date();
  const expires = new Date(inboundAt.getTime() + WINDOW_HOURS() * 60 * 60 * 1000);

  const conversation = await prisma.waConversation.upsert({
    where: { contactId_phoneNumberId: { contactId: contact.id, phoneNumberId: phone.id } },
    create: {
      organizationId: orgId,
      contactId: contact.id,
      phoneNumberId: phone.id,
      status: "OPEN",
      lastInboundAt: inboundAt,
      serviceWindowExpiresAt: expires,
      lastMessagePreview: (event.text ?? event.type).slice(0, 120),
      unreadCount: 1,
    },
    update: {
      lastInboundAt: inboundAt,
      serviceWindowExpiresAt: expires,
      lastMessagePreview: (event.text ?? event.type).slice(0, 120),
      unreadCount: { increment: 1 },
      status: "OPEN",
    },
  });

  await prisma.waMessage.create({
    data: {
      organizationId: orgId,
      contactId: contact.id,
      conversationId: conversation.id,
      phoneNumberId: phone.id,
      direction: "INBOUND",
      type: event.type || "text",
      providerMessageId: event.wamid,
      status: "RECEIVED",
      body: event.text,
      createdAt: inboundAt,
    },
  });

  // Marca resposta em campanha recente
  const recent = await prisma.waCampaignRecipient.findFirst({
    where: {
      contactId: contact.id,
      organizationId: orgId,
      status: { in: ["SENT", "DELIVERED", "READ"] },
      repliedAt: null,
    },
    orderBy: { sentAt: "desc" },
  });
  if (recent) {
    await prisma.waCampaignRecipient.update({
      where: { id: recent.id },
      data: { repliedAt: inboundAt },
    });
    await prisma.waCampaign.update({
      where: { id: recent.campaignId },
      data: { repliedCount: { increment: 1 } },
    });
  }

  if (isOptOutText(event.text)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { status: "OPTED_OUT", optedOutAt: new Date() },
    });
    await audit({
      organizationId: orgId,
      action: "contact.opt_out",
      entity: "Contact",
      entityId: contact.id,
      metadata: { text: event.text, source: "inbound_keyword" },
    });
    logInfo("wa.contact.opted_out", { contactId: contact.id });
    const { runAutomations: runOptOut } = await import("@/wa/automations");
    await runOptOut(orgId, "CONTACT_OPTED_OUT", { contactId: contact.id, conversationId: conversation.id });
  }

  // Dispara automações simples
  const { runAutomations } = await import("@/wa/automations");
  await runAutomations(orgId, "CONTACT_REPLIED", { contactId: contact.id, conversationId: conversation.id });
}
