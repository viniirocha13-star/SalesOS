import { describe, expect, it } from "vitest";
import { eligibilityAllows, isOfferCommerciallyUsable, reasonNotEligible } from "@/offer-engine/eligibility";
import type { Offer } from "@prisma/client";

function offer(partial: Partial<Offer>): Offer {
  return {
    id: "o1",
    name: "x",
    category: "Internet fixa",
    product: "Fibra",
    speedMbps: 500,
    priceCents: 9990,
    promotionalPriceCents: null,
    futurePriceCents: null,
    promotionalPeriod: null,
    benefits: [],
    loyalty: null,
    installation: null,
    city: "Caucaia",
    region: "Ceará",
    eligibility: null,
    rules: null,
    restrictions: null,
    startsAt: new Date("2026-01-01"),
    endsAt: new Date("2026-12-31"),
    source: null,
    bookId: null,
    originalText: null,
    status: "APROVADA",
    reviewNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe("Offer Engine — elegibilidade", () => {
  const now = new Date("2026-08-29");

  it("oferta expirada não é utilizável", () => {
    expect(isOfferCommerciallyUsable(offer({ endsAt: new Date("2026-01-01") }), now)).toBe(false);
  });

  it("oferta rejeitada não entra", () => {
    expect(reasonNotEligible(offer({ status: "REJEITADA" }), { city: "Caucaia" }, now)).toMatch(/REJEITADA/);
  });

  it("oferta draft/detectada não entra", () => {
    expect(reasonNotEligible(offer({ status: "DETECTADA" }), {}, now)).toMatch(/DETECTADA/);
    expect(reasonNotEligible(offer({ status: "AGUARDANDO_APROVACAO" }), {}, now)).toMatch(/AGUARDANDO/);
  });

  it("cidade incompatível é recusada", () => {
    expect(reasonNotEligible(offer({ city: "Natal", region: "RN" }), { city: "Caucaia" }, now)).toMatch(/cidade/);
  });

  it("oferta válida aparece", () => {
    expect(reasonNotEligible(offer({}), { city: "Caucaia" }, now)).toBeNull();
  });

  it("elegibilidade somente móvel bloqueia fibra", () => {
    expect(eligibilityAllows("somente móvel", "fibra")).toBe(false);
    expect(eligibilityAllows(null, "fibra")).toBe(true);
  });
});
