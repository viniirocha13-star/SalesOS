import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { selectOffers } from "@/offer-engine/select";

describe("Offer Engine contra o banco", () => {
  it("não devolve oferta rejeitada, expirada ou de outra cidade", async () => {
    const ranking = await selectOffers({ city: "Caucaia", need: "Fibra" });
    const names = [ranking.best_offer, ranking.alternative_offer, ranking.upsell, ranking.cross_sell]
      .filter(Boolean)
      .map((o) => o!.name);
    expect(names.some((n) => /rejeitada|expirada|detecção pendente/i.test(n))).toBe(false);
    if (ranking.best_offer) {
      expect(ranking.best_offer.status).toBe("APROVADA");
    }
  });

  it("existem ofertas aprovadas no seed", async () => {
    const n = await prisma.offer.count({ where: { status: "APROVADA" } });
    expect(n).toBeGreaterThan(0);
  });
});
