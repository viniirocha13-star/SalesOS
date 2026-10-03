import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { badRequest, notFound } from "@/lib/api-error";
import { estimateCampaignCost } from "@/wa/pricing";
import { resolveListContactIds } from "@/wa/segments";
import { enqueueWaJob, WA_JOB } from "@/workers/wa/queue";
import { checkPlanLimit } from "@/wa/plan-limits";

export const campaignDraftSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phoneNumberId: z.string().min(1),
  templateId: z.string().min(1),
  contactListId: z.string().min(1),
  variableMapping: z.record(z.string(), z.string()).optional(),
  scheduledAt: z.string().optional().nullable(),
});

export async function createCampaign(organizationId: string, userId: string, raw: z.infer<typeof campaignDraftSchema>) {
  const input = campaignDraftSchema.parse(raw);
  const [phone, template, list] = await Promise.all([
    prisma.phoneNumber.findFirst({ where: { id: input.phoneNumberId, organizationId } }),
    prisma.messageTemplate.findFirst({ where: { id: input.templateId, organizationId } }),
    prisma.contactList.findFirst({ where: { id: input.contactListId, organizationId } }),
  ]);
  if (!phone) throw badRequest("Número inválido.");
  if (!template) throw badRequest("Template inválido.");
  if (template.status !== "APPROVED") throw badRequest("Só templates aprovados pela Meta podem ser usados em campanha.");
  if (!list) throw badRequest("Lista inválida.");

  const contactIds = await resolveListContactIds(organizationId, list);
  const estimate = await estimateCampaignCost({
    organizationId,
    market: "BR",
    category: template.category,
    quantity: contactIds.length,
  });

  const campaign = await prisma.waCampaign.create({
    data: {
      organizationId,
      name: input.name,
      status: input.scheduledAt ? "SCHEDULED" : "DRAFT",
      phoneNumberId: phone.id,
      templateId: template.id,
      contactListId: list.id,
      variableMapping: input.variableMapping ?? {},
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      totalContacts: contactIds.length,
      estimatedCost: estimate.estimatedCost ?? undefined,
      estimatedCurrency: estimate.currency,
      createdById: userId,
    },
  });

  await audit({
    actorId: userId,
    organizationId,
    action: "campaign.create",
    entity: "WaCampaign",
    entityId: campaign.id,
  });

  return { campaign, estimate, eligibleContacts: contactIds.length };
}

export async function getCampaignReview(organizationId: string, campaignId: string) {
  const campaign = await prisma.waCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { template: true, phoneNumber: true, contactList: true },
  });
  if (!campaign) throw notFound("Campanha");

  const list = campaign.contactList;
  const contactIds = list ? await resolveListContactIds(organizationId, list) : [];
  const contacts = await prisma.contact.findMany({
    where: { organizationId, id: { in: contactIds } },
    select: { id: true, status: true, optedOutAt: true },
  });

  const optedOut = contacts.filter((c) => c.optedOutAt || c.status === "OPTED_OUT").length;
  const active = contacts.filter((c) => !c.optedOutAt && c.status === "ACTIVE").length;

  let withoutConsent = 0;
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (org?.requireConsentForCampaigns) {
    const withConsent = await prisma.contactConsent.groupBy({
      by: ["contactId"],
      where: {
        organizationId,
        contactId: { in: contacts.map((c) => c.id) },
        revokedAt: null,
      },
    });
    const set = new Set(withConsent.map((c) => c.contactId));
    withoutConsent = contacts.filter((c) => c.status === "ACTIVE" && !c.optedOutAt && !set.has(c.id)).length;
  }

  const estimate = await estimateCampaignCost({
    organizationId,
    market: "BR",
    category: campaign.template.category,
    quantity: active - withoutConsent,
  });

  return {
    campaign,
    stats: {
      total: contacts.length,
      valid: Math.max(0, active - withoutConsent),
      optedOut,
      withoutConsent,
    },
    estimate,
  };
}

export async function startCampaign(organizationId: string, userId: string, campaignId: string) {
  const review = await getCampaignReview(organizationId, campaignId);
  const { campaign, stats } = review;
  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    throw badRequest("Esta campanha não pode ser iniciada no status atual.");
  }
  if (stats.valid < 1) throw badRequest("Nenhum contato válido para envio (opt-out/consentimento).");

  await checkPlanLimit(organizationId, "messages", stats.valid);

  if (campaign.scheduledAt && campaign.scheduledAt > new Date() && campaign.status === "DRAFT") {
    await prisma.waCampaign.update({
      where: { id: campaign.id },
      data: { status: "SCHEDULED" },
    });
    return { status: "SCHEDULED" as const };
  }

  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "QUEUING",
      startedAt: new Date(),
      pausedAt: null,
      estimatedCost: review.estimate.estimatedCost ?? undefined,
      estimatedCurrency: review.estimate.currency,
      totalContacts: stats.valid,
    },
  });

  await enqueueWaJob(WA_JOB.CAMPAIGN_PREPARE, {
    organizationId,
    campaignId: campaign.id,
  });

  await audit({
    actorId: userId,
    organizationId,
    action: "campaign.start",
    entity: "WaCampaign",
    entityId: campaign.id,
  });

  return { status: "QUEUING" as const };
}

export async function pauseCampaign(organizationId: string, userId: string, campaignId: string) {
  const campaign = await prisma.waCampaign.findFirst({ where: { id: campaignId, organizationId } });
  if (!campaign) throw notFound("Campanha");
  if (!["RUNNING", "QUEUING"].includes(campaign.status)) throw badRequest("Só campanhas em andamento podem pausar.");
  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: { status: "PAUSED", pausedAt: new Date() },
  });
  await audit({
    actorId: userId,
    organizationId,
    action: "campaign.pause",
    entity: "WaCampaign",
    entityId: campaign.id,
  });
}

export async function resumeCampaign(organizationId: string, userId: string, campaignId: string) {
  const campaign = await prisma.waCampaign.findFirst({ where: { id: campaignId, organizationId } });
  if (!campaign) throw notFound("Campanha");
  if (campaign.status !== "PAUSED") throw badRequest("Só campanhas pausadas podem retomar.");
  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: { status: "RUNNING", pausedAt: null },
  });
  const pending = await prisma.waCampaignRecipient.findMany({
    where: { campaignId: campaign.id, organizationId, status: { in: ["PENDING", "QUEUED"] } },
    select: { id: true },
    take: 5000,
  });
  for (const r of pending) {
    await enqueueWaJob(
      WA_JOB.MESSAGE_SEND,
      { organizationId, recipientId: r.id },
      { jobId: `send-${r.id}` },
    );
  }
  await audit({
    actorId: userId,
    organizationId,
    action: "campaign.resume",
    entity: "WaCampaign",
    entityId: campaign.id,
  });
}

export async function cancelCampaign(organizationId: string, userId: string, campaignId: string) {
  const campaign = await prisma.waCampaign.findFirst({ where: { id: campaignId, organizationId } });
  if (!campaign) throw notFound("Campanha");
  if (["COMPLETED", "CANCELLED"].includes(campaign.status)) throw badRequest("Campanha já finalizada.");
  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), finishedAt: new Date() },
  });
  await prisma.waCampaignRecipient.updateMany({
    where: { campaignId: campaign.id, status: { in: ["PENDING", "QUEUED"] } },
    data: { status: "SKIPPED", skipReason: "CAMPAIGN_CANCELLED" },
  });
  await audit({
    actorId: userId,
    organizationId,
    action: "campaign.cancel",
    entity: "WaCampaign",
    entityId: campaign.id,
  });
}
