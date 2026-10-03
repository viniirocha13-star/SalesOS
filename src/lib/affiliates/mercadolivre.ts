import type { AffiliateAdapter, AffiliateConvertInput, AffiliateConvertResult } from "@/lib/affiliates/types";

export const mercadolivreAdapter: AffiliateAdapter = {
  marketplace: "MERCADO_LIVRE",
  detect(url) {
    return /mercadolivre\.com\.br|mercadolibre/i.test(url);
  },
  supportsSubId() {
    return true;
  },
  async convert(input: AffiliateConvertInput): Promise<AffiliateConvertResult> {
    const affiliateUrl = input.url.replace(/^https?:\/\//, "https://www.mercadolivre.com.br/");
    return { marketplace: "MERCADO_LIVRE", affiliateUrl, subId: input.subId, campaign: input.campaign };
  },
};
