import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createOffer } from "@/lib/repositories/plim/offers";
import { detectMarketplace } from "@/lib/affiliates";

const bodySchema = z.object({
  tenantId: z.string().min(1),
  productName: z.string().min(1),
  description: z.string().optional(),
  originalLink: z.string().url().optional(),
  affiliateLink: z.string().url().optional(),
  marketplace: z.string().optional(),
  coupon: z.string().optional(),
  originalPrice: z.number().optional(),
  currentPrice: z.number().optional(),
  imageUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  const secret = process.env.PLIM_WEBHOOK_SECRET;
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-plim-webhook-secret");
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`plim-wh:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Limite excedido" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: parsed.data.tenantId } });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant inválido" }, { status: 404 });
  }

  const marketplace =
    (parsed.data.marketplace as import("@prisma/client").PlimMarketplace | undefined) ??
    (parsed.data.originalLink ? detectMarketplace(parsed.data.originalLink) : null) ??
    "OUTRO";

  const offer = await createOffer(tenant.id, {
    productName: parsed.data.productName,
    description: parsed.data.description,
    originalLink: parsed.data.originalLink,
    affiliateLink: parsed.data.affiliateLink,
    marketplace,
    coupon: parsed.data.coupon,
    originalPrice: parsed.data.originalPrice,
    currentPrice: parsed.data.currentPrice,
    imageUrl: parsed.data.imageUrl,
    source: "webhook",
  });

  return NextResponse.json({ ok: true, offerId: offer.id, status: offer.status });
}
