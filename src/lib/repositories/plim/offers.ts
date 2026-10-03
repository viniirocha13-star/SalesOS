import { prisma } from "@/lib/prisma";
import type { PlimMarketplace, PlimOfferStatus, Prisma } from "@prisma/client";
import { buildOfferDuplicateHash } from "@/lib/plim/duplicate-hash";
import { evaluateOfferAgainstRoute } from "@/lib/plim/route-rules";

export async function listOffers(
  tenantId: string,
  filters?: { status?: PlimOfferStatus; q?: string; marketplace?: PlimMarketplace },
) {
  const where: Prisma.PlimOfferWhereInput = {
    tenantId,
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.marketplace ? { marketplace: filters.marketplace } : {}),
    ...(filters?.q
      ? {
          OR: [
            { productName: { contains: filters.q, mode: "insensitive" } },
            { coupon: { contains: filters.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return prisma.plimOffer.findMany({ where, orderBy: { capturedAt: "desc" }, take: 200 });
}

export async function getOffer(tenantId: string, id: string) {
  return prisma.plimOffer.findFirst({ where: { id, tenantId } });
}

export type CreateOfferInput = {
  productName: string;
  productId?: string;
  description?: string;
  messageEmoji?: string;
  editorMessage?: string;
  ctaLabel?: string;
  imageUrl?: string;
  originalPrice?: number;
  currentPrice?: number;
  discountPercent?: number;
  coupon?: string;
  marketplace: PlimMarketplace;
  originalLink?: string;
  affiliateLink?: string;
  category?: string;
  tags?: string[];
  source?: string;
  status?: PlimOfferStatus;
};

export async function createOffer(tenantId: string, data: CreateOfferInput) {
  const settings = await prisma.plimWorkspaceSettings.findUnique({ where: { tenantId } });
  const duplicateHash = buildOfferDuplicateHash({
    marketplace: data.marketplace,
    productId: data.productId,
    originalLink: data.originalLink,
  });

  if (settings && duplicateHash) {
    const windowMs = (settings.duplicateWindowHours ?? 24) * 60 * 60 * 1000;
    const since = new Date(Date.now() - windowMs);
    const dup = await prisma.plimOffer.findFirst({
      where: { tenantId, duplicateHash, capturedAt: { gte: since } },
    });
    if (dup) {
      return prisma.plimOffer.create({
        data: {
          ...data,
          tenantId,
          duplicateHash,
          status: "IGNORADA",
          source: data.source ?? "duplicate",
          originalPrice: data.originalPrice,
          currentPrice: data.currentPrice,
        },
      });
    }
  }

  const blocked = await prisma.plimBlockedWord.findMany({ where: { tenantId, active: true } });
  const routes = await prisma.plimRoute.findMany({ where: { tenantId, status: "ATIVA" } });
  let status: PlimOfferStatus = "NOVA";
  for (const route of routes) {
    const ev = evaluateOfferAgainstRoute(
      {
        productName: data.productName,
        description: data.description ?? null,
        marketplace: data.marketplace,
        category: data.category ?? null,
        currentPrice: data.currentPrice != null ? (data.currentPrice as unknown as Prisma.Decimal) : null,
        discountPercent: data.discountPercent ?? null,
      },
      route,
      blocked,
    );
    if (ev.status === "IGNORADA") {
      status = "IGNORADA";
      break;
    }
    if (ev.status === "EM_ANALISE") status = "EM_ANALISE";
  }

  return prisma.plimOffer.create({
    data: {
      tenantId,
      duplicateHash,
      status: data.status ?? status,
      productName: data.productName,
      productId: data.productId,
      description: data.description,
      messageEmoji: data.messageEmoji,
      editorMessage: data.editorMessage,
      ctaLabel: data.ctaLabel,
      imageUrl: data.imageUrl,
      originalPrice: data.originalPrice,
      currentPrice: data.currentPrice,
      discountPercent: data.discountPercent,
      coupon: data.coupon,
      marketplace: data.marketplace,
      originalLink: data.originalLink,
      affiliateLink: data.affiliateLink,
      category: data.category,
      tags: data.tags ?? [],
      source: data.source,
    },
  });
}

export async function updateOffer(tenantId: string, id: string, data: Prisma.PlimOfferUpdateInput) {
  const existing = await getOffer(tenantId, id);
  if (!existing) throw new Error("Oferta não encontrada");
  return prisma.plimOffer.update({ where: { id }, data });
}

export async function deleteOffer(tenantId: string, id: string) {
  return prisma.plimOffer.deleteMany({ where: { id, tenantId } });
}
