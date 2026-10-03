import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const awinAdapter: AffiliateAdapter = {
  marketplace: "AWIN",
  detect(url) {
    return /awin1\.com|awin\.com/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const publisher = requireEnv("PLIM_AWIN_PUBLISHER_ID", "Awin", input.envOverrides);
    const sep = input.url.includes("?") ? "&" : "?";
    const affiliateUrl = `${input.url}${sep}awinmid=${encodeURIComponent(publisher)}${
      input.subId ? `&clickref=${encodeURIComponent(input.subId)}` : ""
    }`;
    return { marketplace: "AWIN", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
