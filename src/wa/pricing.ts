import { Decimal } from "@prisma/client/runtime/library";
import type { TemplateCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type RateQuery = {
  market: string;
  category: TemplateCategory;
  date?: Date;
  organizationId?: string;
};

/**
 * Tarifas configuráveis — nunca hardcode de preço do curso.
 * Busca rate da organização ou global (organizationId null).
 */
export async function getRate(query: RateQuery): Promise<{
  rate: number;
  currency: string;
  source: string;
  found: boolean;
}> {
  const at = query.date ?? new Date();
  const rows = await prisma.pricingRate.findMany({
    where: {
      category: query.category,
      market: query.market.toUpperCase(),
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      AND: [
        {
          OR: [
            { organizationId: query.organizationId ?? undefined },
            { organizationId: null },
          ],
        },
      ],
    },
    orderBy: [{ organizationId: "desc" }, { volumeTierMin: "desc" }, { effectiveFrom: "desc" }],
    take: 5,
  });

  // Prefer org-specific over global
  const row =
    rows.find((r) => r.organizationId === query.organizationId) ??
    rows.find((r) => r.organizationId == null) ??
    null;

  if (!row) {
    return { rate: 0, currency: "BRL", source: "unavailable", found: false };
  }
  return {
    rate: Number(row.rate),
    currency: row.currency,
    source: row.source,
    found: true,
  };
}

export async function estimateCampaignCost(input: {
  organizationId: string;
  market: string;
  category: TemplateCategory;
  quantity: number;
}) {
  const { rate, currency, source, found } = await getRate({
    organizationId: input.organizationId,
    market: input.market,
    category: input.category,
  });
  const estimated = found ? rate * input.quantity : null;
  return {
    estimatedCost: estimated,
    currency,
    unitRate: found ? rate : null,
    source: found ? source : "unavailable",
    found,
    note: found
      ? "Estimativa com base nas tarifas configuradas. A cobrança real é da Meta."
      : "Sem tarifa configurada para este mercado/categoria. Cadastre em pricing_rates — não usamos preços fixos do curso.",
  };
}

export async function upsertPricingRate(input: {
  organizationId?: string | null;
  market: string;
  category: TemplateCategory;
  currency?: string;
  rate: number;
  source?: string;
  volumeTierMin?: number;
  effectiveFrom?: Date;
}) {
  return prisma.pricingRate.create({
    data: {
      organizationId: input.organizationId ?? null,
      market: input.market.toUpperCase(),
      category: input.category,
      currency: input.currency ?? "BRL",
      rate: new Decimal(input.rate),
      source: input.source ?? "manual",
      volumeTierMin: input.volumeTierMin ?? 0,
      effectiveFrom: input.effectiveFrom ?? new Date(),
    },
  });
}
