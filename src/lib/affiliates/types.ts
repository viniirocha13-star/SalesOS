import type { PlimMarketplace } from "@prisma/client";

export type AffiliateConvertInput = {
  url: string;
  subId?: string;
  campaign?: string;
};

export type AffiliateConvertResult = {
  marketplace: PlimMarketplace;
  affiliateUrl: string;
  subId?: string;
  campaign?: string;
};

export interface AffiliateAdapter {
  readonly marketplace: PlimMarketplace;
  detect(url: string): boolean;
  supportsSubId(): boolean;
  convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult>;
}
