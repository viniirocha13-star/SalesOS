import { prisma } from "@/lib/prisma";
import { getViabilityProvider } from "@/integrations/viability/provider";
import { emit } from "@/events/bus";
import { transitionLead } from "@/domain/leads";
import type { ViabilityResult } from "@prisma/client";

export async function runViabilityForLead(
  leadId: string,
  extra: {
    address?: string;
    zipCode?: string;
    city?: string;
    neighborhood?: string;
    latitude?: number;
    longitude?: number;
  } = {},
) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const input = {
    address: extra.address ?? lead.address ?? undefined,
    zipCode: extra.zipCode ?? lead.zipCode ?? undefined,
    city: extra.city ?? lead.city ?? undefined,
    neighborhood: extra.neighborhood ?? lead.neighborhood ?? undefined,
    latitude: extra.latitude ?? lead.latitude ?? undefined,
    longitude: extra.longitude ?? lead.longitude ?? undefined,
  };
  await transitionLead(leadId, "CONSULTANDO_VIABILIDADE", "viability_pipeline");
  const result = await getViabilityProvider().check(input);
  const lat = (result.details.latitude as number | undefined) ?? input.latitude;
  const lng = (result.details.longitude as number | undefined) ?? input.longitude;

  if (lat != null && lng != null) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        latitude: lat,
        longitude: lng,
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        neighborhood: input.neighborhood,
      },
    });
  } else if (input.address || input.city) {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        address: input.address,
        zipCode: input.zipCode,
        city: input.city,
        neighborhood: input.neighborhood,
      },
    });
  }

  const check = await prisma.viabilityCheck.create({
    data: {
      leadId,
      address: input.address,
      zipCode: input.zipCode,
      city: input.city,
      neighborhood: input.neighborhood,
      latitude: lat ?? null,
      longitude: lng ?? null,
      result: result.result,
      source: result.source,
      details: result.details as object,
    },
  });
  await emit("VIABILITY_CHECKED", leadId, { result: result.result, source: result.source, checkId: check.id });
  return {
    viability: {
      ...result,
      id: check.id,
      city: input.city,
      latitude: lat ?? null,
      longitude: lng ?? null,
      queued_for_operator: Boolean(result.details.queued) && !result.reliable,
    },
  };
}

export async function listQueuedBoxChecks() {
  const rows = await prisma.viabilityCheck.findMany({
    where: {
      result: "INDETERMINADO",
      source: { in: ["geocode_operator_queue", "official_api_failed", "official_api_unmapped", "official_not_configured"] },
    },
    include: { lead: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.leadId)) return false;
    seen.add(row.leadId);
    const details = (row.details ?? {}) as { queued?: boolean };
    return details.queued !== false;
  });
}

export async function resolveBoxCheck(checkId: string, result: ViabilityResult, actorId: string) {
  if (result !== "VIAVEL" && result !== "NAO_VIAVEL") {
    throw new Error("resultado_invalido");
  }
  const current = await prisma.viabilityCheck.findUniqueOrThrow({
    where: { id: checkId },
    include: { lead: true },
  });
  const created = await prisma.viabilityCheck.create({
    data: {
      leadId: current.leadId,
      address: current.address,
      zipCode: current.zipCode,
      city: current.city,
      neighborhood: current.neighborhood,
      latitude: current.latitude,
      longitude: current.longitude,
      result,
      source: "operator_box",
      details: {
        queued: false,
        resolved_from: current.id,
        actorId,
        latitude: current.latitude,
        longitude: current.longitude,
      },
    },
  });
  await prisma.viabilityCheck.update({
    where: { id: current.id },
    data: { details: { ...((current.details as object) ?? {}), queued: false, superseded_by: created.id } },
  });
  await emit("VIABILITY_CHECKED", current.leadId, { result, source: "operator_box", checkId: created.id });
  return created;
}
