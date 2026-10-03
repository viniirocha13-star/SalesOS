import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const shopeeAdapter: AffiliateAdapter = {
  marketplace: "SHOPEE",
  detect(url) {
    return /shopee\.com\.br|shp\.ee/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const affiliateId = requireEnv("PLIM_SHOPEE_AFFILIATE_ID", "Shopee");
    const sep = input.url.includes("?") ? "&" : "?";
    const affiliateUrl = `${input.url}${sep}utm_source=affiliate&utm_medium=${encodeURIComponent(affiliateId)}${
      input.subId ? `&sub_id=${encodeURIComponent(input.subId)}` : ""
    }`;
    return { marketplace: "SHOPEE", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
