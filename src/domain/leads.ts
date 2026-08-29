import { prisma } from "@/lib/prisma";
import { emit } from "@/events/bus";
import type { LeadSource, LeadStatus } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";

export async function createLead(input: {
  name?: string;
  phone: string;
  city?: string;
  origin?: LeadSource;
  source?: string;
  campaignId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  adset?: string;
  ad?: string;
}) {
  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      phone: normalizePhone(input.phone),
      city: input.city,
      origin: input.origin ?? "OUTROS",
      source: input.source,
      campaignId: input.campaignId,
      adset: input.adset,
      ad: input.ad,
      utmSource: input.utmSource,
      utmMedium: input.utmMedium,
      utmCampaign: input.utmCampaign,
      utmContent: input.utmContent,
    },
  });
  await prisma.leadStatusHistory.create({
    data: { leadId: lead.id, toStatus: "NOVO", reason: "criação" },
  });
  await emit("LEAD_CREATED", lead.id, { origin: lead.origin, campaignId: lead.campaignId });
  return lead;
}

export async function transitionLead(leadId: string, toStatus: LeadStatus, reason?: string, actorId?: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  if (lead.status === toStatus) return lead;
  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { status: toStatus },
  });
  await prisma.leadStatusHistory.create({
    data: {
      leadId,
      fromStatus: lead.status,
      toStatus,
      reason,
      actorId,
    },
  });
  return updated;
}
