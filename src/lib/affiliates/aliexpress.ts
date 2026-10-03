import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";

export const aliexpressAdapter: AffiliateAdapter = {
  marketplace: "ALIEXPRESS",
  detect(url) {
    return /aliexpress\.com/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    return { marketplace: "ALIEXPRESS", affiliateUrl: input.url, subId: input.subId, campaign: input.campaign };
  },
};
