import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";

export const sheinAdapter: AffiliateAdapter = {
  marketplace: "SHEIN",
  detect(url) {
    return /shein\.com/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    return { marketplace: "SHEIN", affiliateUrl: input.url, subId: input.subId, campaign: input.campaign };
  },
};
