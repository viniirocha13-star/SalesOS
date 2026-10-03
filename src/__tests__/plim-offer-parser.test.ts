import { describe, expect, it } from "vitest";
import { parsePastedOfferText } from "@/lib/plim/offer-parser";

describe("parsePastedOfferText", () => {
  it("extrai produto, preços, cupom e link", () => {
    const text = `Fone Bluetooth XYZ
De R$ 199,90 por R$ 89,90
Cupom: PLIM10
https://shopee.com.br/produto/123`;
    const parsed = parsePastedOfferText(text);
    expect(parsed.productName).toContain("Fone");
    expect(parsed.marketplace).toBe("SHOPEE");
    expect(parsed.coupon).toBe("PLIM10");
    expect(parsed.originalPrice).toBe(199.9);
    expect(parsed.currentPrice).toBe(89.9);
    expect(parsed.originalLink).toContain("shopee");
  });
});
