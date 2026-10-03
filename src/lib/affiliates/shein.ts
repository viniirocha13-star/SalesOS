import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const sheinAdapter: AffiliateAdapter = {
  marketplace: "SHEIN",
  detect(url) {
    return /shein\.com/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const affiliateId = requireEnv("PLIM_SHEIN_AFFILIATE_ID", "SHEIN");
    const sep = input.url.includes("?") ? "&" : "?";
    const affiliateUrl = `${input.url}${sep}aff_id=${encodeURIComponent(affiliateId)}${
      input.subId ? `&sub_id=${encodeURIComponent(input.subId)}` : ""
    }`;
    return { marketplace: "SHEIN", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
