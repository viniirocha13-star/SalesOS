import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";

export const awinAdapter: AffiliateAdapter = {
  marketplace: "AWIN",
  detect(url) {
    return /awin1\.com|awin\.com/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    return { marketplace: "AWIN", affiliateUrl: input.url, subId: input.subId, campaign: input.campaign };
  },
};
