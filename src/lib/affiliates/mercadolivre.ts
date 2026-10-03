import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";
import { requireEnv } from "@/lib/affiliates/errors";

export const mercadolivreAdapter: AffiliateAdapter = {
  marketplace: "MERCADO_LIVRE",
  detect(url) {
    return /mercadolivre\.com\.br|mercadolibre/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const tracking = requireEnv("PLIM_MERCADOLIVRE_TRACKING_ID", "Mercado Livre", input.envOverrides);
    const base = input.url.replace(/^https?:\/\//, "https://www.mercadolivre.com.br/");
    const sep = base.includes("?") ? "&" : "?";
    const affiliateUrl = `${base}${sep}matt_tool=${encodeURIComponent(tracking)}${
      input.subId ? `&matt_word=${encodeURIComponent(input.subId)}` : ""
    }`;
    return { marketplace: "MERCADO_LIVRE", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
