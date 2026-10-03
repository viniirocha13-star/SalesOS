import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";

export const amazonAdapter: AffiliateAdapter = {
  marketplace: "AMAZON",
  detect(url) {
    return /amazon\.com\.br|amzn\.to/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const tag = process.env.PLIM_AMAZON_TAG ?? "plim-20";
    const sep = input.url.includes("?") ? "&" : "?";
    const affiliateUrl = `${input.url}${sep}tag=${encodeURIComponent(tag)}`;
    return { marketplace: "AMAZON", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
