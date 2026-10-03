import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const amazonAdapter: AffiliateAdapter = {
  marketplace: "AMAZON",
  detect(url) {
    return /amazon\.com\.br|amzn\.to/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const tag = requireEnv("PLIM_AMAZON_TAG", "Amazon");
    const sep = input.url.includes("?") ? "&" : "?";
    let affiliateUrl = `${input.url}${sep}tag=${encodeURIComponent(tag)}`;
    if (input.subId) {
      affiliateUrl += `&ascsubtag=${encodeURIComponent(input.subId)}`;
    }
    return { marketplace: "AMAZON", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
