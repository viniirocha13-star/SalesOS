import { prisma } from "@/lib/prisma";
import { getDecryptedToken } from "@/wa/meta-connection";
import { sendTemplateMessage } from "@/integrations/meta/graph";
import { MetaApiError, isPermanentSendFailure, isTemporaryMetaError } from "@/integrations/meta/errors";
import { RateLimitService } from "@/workers/wa/rate-limit-service";
import { incrementUsage } from "@/wa/plan-limits";
import { getRate } from "@/wa/pricing";
import { logError, logInfo } from "@/lib/logger";

function assertTestMode(to: string) {
  if (process.env.TEST_MODE !== "1") return;
  const allowed = (process.env.TEST_MODE_ALLOWED_NUMBERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.includes(to)) {
    throw new Error("TEST_MODE: número não autorizado para envio.");
  }
}

export async function sendCampaignMessage(recipientId: string) {
  const recipient = await prisma.waCampaignRecipient.findUnique({
    where: { id: recipientId },
    include: {
      contact: true,
      campaign: { include: { template: true, phoneNumber: true } },
    },
  });
  if (!recipient) return;
  if (["SENT", "DELIVERED", "READ", "SKIPPED"].includes(recipient.status)) return;

  const { campaign, contact } = recipient;
  if (!["RUNNING", "QUEUING"].includes(campaign.status)) return;

  if (contact.optedOutAt || contact.status === "OPTED_OUT") {
    await prisma.waCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "SKIPPED", skipReason: "OPTED_OUT" },
    });
    await prisma.waCampaign.update({
      where: { id: campaign.id },
      data: { skippedCount: { increment: 1 } },
    });
    return;
  }

  if (campaign.template.status !== "APPROVED") {
    await markFailed(recipient.id, campaign.id, "TEMPLATE_NOT_APPROVED", "Template não está aprovado.");
    return;
  }

  const token = await getDecryptedToken(campaign.organizationId);
  if (!token) {
    await markFailed(recipient.id, campaign.id, "NO_TOKEN", "Token Meta ausente.");
    return;
  }

  assertTestMode(contact.phoneE164);

  const limiter = new RateLimitService(campaign.phoneNumber.phoneNumberId, campaign.organizationId);
  const slot = await limiter.acquire();
  if (!slot.allowed) {
    const err = new Error("RATE_LIMIT_LOCAL");
    (err as Error & { temporary: boolean }).temporary = true;
    throw err;
  }

  const variables = Array.isArray(recipient.variables) ? (recipient.variables as string[]) : [];

  try {
    const result = await sendTemplateMessage({
      accessToken: token,
      phoneNumberId: campaign.phoneNumber.phoneNumberId,
      toE164: contact.phoneE164,
      templateName: campaign.template.name,
      language: campaign.template.language,
      bodyParams: variables,
    });
    const providerMessageId = result.messages?.[0]?.id ?? `local-${recipient.id}`;

    const message = await prisma.waMessage.create({
      data: {
        organizationId: campaign.organizationId,
        contactId: contact.id,
        campaignId: campaign.id,
        phoneNumberId: campaign.phoneNumberId,
        direction: "OUTBOUND",
        type: "template",
        category: campaign.template.category,
        providerMessageId,
        status: "SENT",
        body: campaign.template.body,
        templateName: campaign.template.name,
        payload: { variables },
        sentAt: new Date(),
      },
    });

    await prisma.waCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId,
        messageId: message.id,
        attempts: { increment: 1 },
        failureCode: null,
        failureMessage: null,
      },
    });

    await prisma.waCampaign.update({
      where: { id: campaign.id },
      data: { sentCount: { increment: 1 } },
    });

    await upsertConversationOutbound(campaign.organizationId, contact.id, campaign.phoneNumberId, campaign.template.name);
    await incrementUsage(campaign.organizationId, "messages", 1);

    const price = await getRate({
      organizationId: campaign.organizationId,
      market: "BR",
      category: campaign.template.category,
    });
    if (price.found) {
      await prisma.messageCost.create({
        data: {
          organizationId: campaign.organizationId,
          messageId: message.id,
          category: campaign.template.category,
          market: "BR",
          currency: price.currency,
          estimatedCost: price.rate,
          source: price.source,
        },
      });
    }

    await limiter.onSuccess();
    logInfo("wa.message.sent", { recipientId, campaignId: campaign.id });
  } catch (error) {
    const code =
      error instanceof MetaApiError
        ? String(error.code ?? "META_ERROR")
        : error instanceof Error && error.message === "RATE_LIMIT_LOCAL"
          ? "RATE_LIMIT_LOCAL"
          : "SEND_FAILED";
    const message =
      error instanceof MetaApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Falha no envio";

    const temporary =
      code === "RATE_LIMIT_LOCAL" ||
      (error instanceof MetaApiError && isTemporaryMetaError(error.code, error.httpStatus));

    if (code === "RATE_LIMIT_LOCAL" || (error instanceof MetaApiError && (error.code === 130429 || error.code === 4))) {
      await limiter.onRateLimitHit();
    }

    await prisma.waCampaignRecipient.update({
      where: { id: recipient.id },
      data: {
        attempts: { increment: 1 },
        failureCode: code,
        failureMessage: message,
      },
    });

    if (
      !temporary ||
      isPermanentSendFailure(error instanceof MetaApiError ? error.code : undefined)
    ) {
      await markFailed(recipient.id, campaign.id, code, message);
      return;
    }

    logError("wa.message.retry", { recipientId, code, message });
    throw error; // BullMQ retry com backoff
  }
}

async function markFailed(recipientId: string, campaignId: string, code: string, message: string) {
  await prisma.waCampaignRecipient.update({
    where: { id: recipientId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      failureCode: code,
      failureMessage: message,
    },
  });
  await prisma.waCampaign.update({
    where: { id: campaignId },
    data: { failedCount: { increment: 1 } },
  });
}

async function upsertConversationOutbound(
  organizationId: string,
  contactId: string,
  phoneNumberId: string,
  preview: string,
) {
  await prisma.waConversation.upsert({
    where: { contactId_phoneNumberId: { contactId, phoneNumberId } },
    create: {
      organizationId,
      contactId,
      phoneNumberId,
      status: "OPEN",
      lastOutboundAt: new Date(),
      lastMessagePreview: preview.slice(0, 120),
    },
    update: {
      lastOutboundAt: new Date(),
      lastMessagePreview: preview.slice(0, 120),
      status: "OPEN",
    },
  });
}
