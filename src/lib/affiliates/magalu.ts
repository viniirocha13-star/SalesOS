import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";

export const magaluAdapter: AffiliateAdapter = {
  marketplace: "MAGALU",
  detect(url) {
    return /magazineluiza\.com\.br|magalu\.com/i.test(url);
  },
  supportsSubId() {
    return false;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    return { marketplace: "MAGALU", affiliateUrl: input.url, subId: input.subId, campaign: input.campaign };
  },
};
