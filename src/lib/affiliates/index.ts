import type { PlimMarketplace } from "@prisma/client";
import type { AffiliateAdapter, AffiliateConvertInput } from "@/lib/affiliates/types";
import { shopeeAdapter } from "@/lib/affiliates/shopee";
import { mercadolivreAdapter } from "@/lib/affiliates/mercadolivre";
import { amazonAdapter } from "@/lib/affiliates/amazon";
import { magaluAdapter } from "@/lib/affiliates/magalu";
import { aliexpressAdapter } from "@/lib/affiliates/aliexpress";
import { sheinAdapter } from "@/lib/affiliates/shein";
import { awinAdapter } from "@/lib/affiliates/awin";

export const affiliateAdapters: AffiliateAdapter[] = [
  shopeeAdapter,
  mercadolivreAdapter,
  amazonAdapter,
  magaluAdapter,
  aliexpressAdapter,
  sheinAdapter,
  awinAdapter,
];

export function detectMarketplace(url: string): PlimMarketplace | null {
  const hit = affiliateAdapters.find((a) => a.detect(url));
  return hit?.marketplace ?? null;
}

export function getAdapterForUrl(url: string): AffiliateAdapter | null {
  return affiliateAdapters.find((a) => a.detect(url)) ?? null;
}

export async function convertAffiliateUrl(input: AffiliateConvertInput) {
  const adapter = getAdapterForUrl(input.url);
  if (!adapter) throw new Error("Marketplace não reconhecido para este link.");
  return adapter.convert(input);
}
