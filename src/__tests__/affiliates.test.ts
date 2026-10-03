import { describe, expect, it } from "vitest";
import { detectMarketplace, getAdapterForUrl } from "@/lib/affiliates";

describe("Affiliate adapters", () => {
  it("detecta marketplace por URL", () => {
    expect(detectMarketplace("https://shopee.com.br/produto/123")).toBe("SHOPEE");
    expect(detectMarketplace("https://www.mercadolivre.com.br/item/1")).toBe("MERCADO_LIVRE");
    expect(detectMarketplace("https://example.com")).toBeNull();
  });

  it("converte com assinatura stub", async () => {
    const adapter = getAdapterForUrl("https://www.amazon.com.br/dp/123");
    expect(adapter?.marketplace).toBe("AMAZON");
    const out = await adapter!.convert({ url: "https://www.amazon.com.br/dp/123", subId: "grupo1" });
    expect(out.affiliateUrl).toContain("tag=");
    expect(out.marketplace).toBe("AMAZON");
  });
});
