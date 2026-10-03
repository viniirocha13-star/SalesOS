import { describe, expect, it } from "vitest";
import { offerMatchesPilot } from "@/lib/plim/autopilot-run";
import type { PlimAutopilot, PlimOffer } from "@prisma/client";

const baseOffer = {
  id: "o1",
  tenantId: "t1",
  productName: "Produto DEMO Fone",
  marketplace: "SHOPEE",
  currentPrice: 99.9,
  discountPercent: 40,
  status: "NOVA",
} as PlimOffer;

const basePilot = {
  marketplace: "SHOPEE",
  minDiscount: 30,
  searchQuery: "Produto",
  minPrice: null,
  maxPrice: null,
} as PlimAutopilot;

describe("offerMatchesPilot", () => {
  it("aceita oferta compatível", () => {
    expect(offerMatchesPilot(baseOffer, basePilot)).toBe(true);
  });

  it("rejeita marketplace diferente", () => {
    expect(offerMatchesPilot({ ...baseOffer, marketplace: "AMAZON" }, basePilot)).toBe(false);
  });

  it("rejeita quando busca não bate", () => {
    expect(offerMatchesPilot(baseOffer, { ...basePilot, searchQuery: "notebook" })).toBe(false);
  });
});
