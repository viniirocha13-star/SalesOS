import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const magaluAdapter: AffiliateAdapter = {
  marketplace: "MAGALU",
  detect(url) {
    return /magazineluiza\.com\.br|magalu\.com/i.test(url);
  },
  supportsSubId() {
    return false;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const partner = requireEnv("PLIM_MAGALU_PARTNER_ID", "Magalu", input.envOverrides);
    const sep = input.url.includes("?") ? "&" : "?";
    const affiliateUrl = `${input.url}${sep}partner_id=${encodeURIComponent(partner)}`;
    return { marketplace: "MAGALU", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
