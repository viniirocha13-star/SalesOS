import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const aliexpressAdapter: AffiliateAdapter = {
  marketplace: "ALIEXPRESS",
  detect(url) {
    return /aliexpress\.com/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const tracking = requireEnv("PLIM_ALIEXPRESS_TRACKING_ID", "AliExpress", input.envOverrides);
    const sep = input.url.includes("?") ? "&" : "?";
    const affiliateUrl = `${input.url}${sep}aff_platform=api&aff_trace_key=${encodeURIComponent(tracking)}${
      input.subId ? `&sub_id=${encodeURIComponent(input.subId)}` : ""
    }`;
    return { marketplace: "ALIEXPRESS", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
