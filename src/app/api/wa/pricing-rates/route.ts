import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJson, withApi, badRequest } from "@/lib/api-error";
import { requireOrg } from "@/lib/org";
import { upsertPricingRate, getRate } from "@/wa/pricing";
import type { TemplateCategory } from "@prisma/client";

export const GET = withApi(async (request: Request) => {
  const ctx = await requireOrg("billing.view");
  const url = new URL(request.url);
  const market = url.searchParams.get("market") ?? "BR";
  const category = (url.searchParams.get("category") ?? "MARKETING") as TemplateCategory;
  const rates = await prisma.pricingRate.findMany({
    where: {
      OR: [{ organizationId: ctx.organization.id }, { organizationId: null }],
      market: market.toUpperCase(),
    },
    orderBy: [{ category: "asc" }, { effectiveFrom: "desc" }],
    take: 50,
  });
  const current = await getRate({
    organizationId: ctx.organization.id,
    market,
    category,
  });
  return NextResponse.json({ rates, current });
});

const postSchema = z.object({
  market: z.string().min(2).max(8),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  currency: z.string().default("BRL"),
  rate: z.number().nonnegative(),
  source: z.string().default("manual"),
  volumeTierMin: z.number().int().nonnegative().optional(),
});

export const POST = withApi(async (request: Request) => {
  const ctx = await requireOrg("billing.manage");
  const body = postSchema.parse(await readJson(request));
  if (body.rate < 0) throw badRequest("Tarifa inválida.");
  const row = await upsertPricingRate({
    organizationId: ctx.organization.id,
    market: body.market,
    category: body.category,
    currency: body.currency,
    rate: body.rate,
    source: body.source,
    volumeTierMin: body.volumeTierMin,
  });
  return NextResponse.json({ ok: true, rate: row });
});
