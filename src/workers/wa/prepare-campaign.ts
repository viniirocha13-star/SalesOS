import { prisma } from "@/lib/prisma";
import { enqueueWaJob, WA_JOB } from "@/workers/wa/queue";
import { logInfo } from "@/lib/logger";

/** Monta campaign_recipients e enfileira message.send */
export async function prepareCampaign(campaignId: string) {
  const campaign = await prisma.waCampaign.findUnique({
    where: { id: campaignId },
    include: { contactList: true, template: true },
  });
  if (!campaign || !campaign.contactList) return;
  if (campaign.status !== "QUEUING" && campaign.status !== "RUNNING") return;

  const { resolveListContactIds } = await import("@/wa/segments");
  const contactIds = await resolveListContactIds(campaign.organizationId, campaign.contactList);

  const contacts = await prisma.contact.findMany({
    where: { organizationId: campaign.organizationId, id: { in: contactIds } },
    include: { consents: { where: { revokedAt: null }, take: 1 } },
  });

  const org = await prisma.organization.findUnique({ where: { id: campaign.organizationId } });
  const mapping = (campaign.variableMapping ?? {}) as Record<string, string>;

  let queued = 0;
  let skipped = 0;

  for (const contact of contacts) {
    if (contact.optedOutAt || contact.status === "OPTED_OUT" || contact.status === "BLOCKED") {
      await prisma.waCampaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
        create: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          contactId: contact.id,
          status: "SKIPPED",
          skipReason: "OPTED_OUT",
        },
        update: { status: "SKIPPED", skipReason: "OPTED_OUT" },
      });
      skipped += 1;
      continue;
    }
    if (org?.requireConsentForCampaigns && contact.consents.length === 0) {
      await prisma.waCampaignRecipient.upsert({
        where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
        create: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          contactId: contact.id,
          status: "SKIPPED",
          skipReason: "NO_CONSENT",
        },
        update: { status: "SKIPPED", skipReason: "NO_CONSENT" },
      });
      skipped += 1;
      continue;
    }

    const variables = buildVariables(contact, mapping);
    const recipient = await prisma.waCampaignRecipient.upsert({
      where: { campaignId_contactId: { campaignId: campaign.id, contactId: contact.id } },
      create: {
        organizationId: campaign.organizationId,
        campaignId: campaign.id,
        contactId: contact.id,
        status: "QUEUED",
        variables,
        queuedAt: new Date(),
      },
      update: {
        status: "QUEUED",
        variables,
        queuedAt: new Date(),
        skipReason: null,
      },
    });

    await enqueueWaJob(
      WA_JOB.MESSAGE_SEND,
      { organizationId: campaign.organizationId, recipientId: recipient.id },
      { jobId: `send-${recipient.id}` },
    );
    queued += 1;
  }

  await prisma.waCampaign.update({
    where: { id: campaign.id },
    data: {
      status: "RUNNING",
      queuedCount: queued,
      skippedCount: skipped,
      totalContacts: queued + skipped,
    },
  });

  logInfo("wa.campaign.prepared", { campaignId, queued, skipped });
}

function buildVariables(
  contact: { name: string | null; phoneE164: string; email: string | null; city: string | null },
  mapping: Record<string, string>,
) {
  const values: string[] = [];
  const keys = Object.keys(mapping).sort((a, b) => Number(a) - Number(b));
  if (!keys.length) {
    if (contact.name) values.push(contact.name);
    return values;
  }
  for (const k of keys) {
    const field = mapping[k];
    if (field === "name") values.push(contact.name ?? "");
    else if (field === "phone") values.push(contact.phoneE164);
    else if (field === "email") values.push(contact.email ?? "");
    else if (field === "city") values.push(contact.city ?? "");
    else values.push(field);
  }
  return values;
}
