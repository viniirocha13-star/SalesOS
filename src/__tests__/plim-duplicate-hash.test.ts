import { describe, expect, it } from "vitest";
import { buildOfferDuplicateHash } from "@/lib/plim/duplicate-hash";

describe("buildOfferDuplicateHash", () => {
  it("usa productId quando disponível", () => {
    const a = buildOfferDuplicateHash({ marketplace: "AMAZON", productId: "B123", originalLink: "x" });
    const b = buildOfferDuplicateHash({ marketplace: "AMAZON", productId: "B123", originalLink: "y" });
    expect(a).toBe(b);
  });

  it("diferencia marketplaces", () => {
    const a = buildOfferDuplicateHash({ marketplace: "AMAZON", originalLink: "https://amazon.com.br/dp/1" });
    const b = buildOfferDuplicateHash({ marketplace: "SHOPEE", originalLink: "https://amazon.com.br/dp/1" });
    expect(a).not.toBe(b);
  });
});
