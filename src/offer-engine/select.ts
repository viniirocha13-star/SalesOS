import { prisma } from "@/lib/prisma";
import type { Offer } from "@prisma/client";
import { reasonNotEligible } from "./eligibility";

export type OfferEngineInput = {
  city?: string | null;
  neighborhood?: string | null;
  need?: string | null;
  users?: number | null;
  usage?: string | null;
  currentInternet?: string | null;
  currentBillCents?: number | null;
  mobileInterest?: boolean;
  lines?: number | null;
  portability?: boolean;
  preferences?: string | null;
  viabilityReliable?: boolean;
};

export type OfferEngineOutput = {
  best_offer: Offer | null;
  alternative_offer: Offer | null;
  upsell: Offer | null;
  cross_sell: Offer | null;
  reasoning_metadata: {
    rules: string[];
    rejected: string[];
    eligibleCount: number;
  };
};

export async function selectOffers(input: OfferEngineInput): Promise<OfferEngineOutput> {
  const now = new Date();
  const candidates = await prisma.offer.findMany({
    where: { status: "APROVADA" },
  });

  const rules: string[] = [];
  const rejected: string[] = [];
  const eligible = candidates.filter((offer) => {
    const reason = reasonNotEligible(offer, input, now);
    if (reason) {
      rejected.push(reason);
      return false;
    }
    return true;
  });

  rules.push("somente ofertas APROVADAS e vigentes");
  rules.push("filtro de cidade/região quando informado");
  rules.push("IA não recebe ofertas inelegíveis");

  const scored = eligible
    .map((offer) => ({ offer, score: scoreOffer(offer, input, rules) }))
    .sort((a, b) => b.score - a.score);

  const fiber = scored.filter((s) => /fibra|banda|internet/i.test(`${s.offer.category} ${s.offer.product}`));
  const mobile = scored.filter((s) => /móvel|movel|chip|linha/i.test(`${s.offer.category} ${s.offer.product}`));

  const best = (fiber[0] ?? scored[0])?.offer ?? null;
  const alternative = (fiber[1] ?? scored[1])?.offer ?? null;
  const upsell = fiber.find((s) => (s.offer.speedMbps ?? 0) > (best?.speedMbps ?? 0))?.offer ?? null;
  const cross = input.mobileInterest !== false ? (mobile[0]?.offer ?? null) : null;

  return {
    best_offer: best,
    alternative_offer: alternative && alternative.id !== best?.id ? alternative : null,
    upsell: upsell && upsell.id !== best?.id ? upsell : null,
    cross_sell: cross && cross.id !== best?.id ? cross : null,
    reasoning_metadata: { rules, rejected: rejected.slice(0, 20), eligibleCount: eligible.length },
  };
}

function scoreOffer(offer: Offer, input: OfferEngineInput, rules: string[]): number {
  let score = 10;
  const users = input.users ?? 3;
  const targetSpeed = users <= 2 ? 300 : users <= 4 ? 500 : 700;
  if (offer.speedMbps) {
    const diff = Math.abs(offer.speedMbps - targetSpeed);
    score += Math.max(0, 30 - diff / 20);
  }
  if (input.currentBillCents && offer.promotionalPriceCents) {
    if (offer.promotionalPriceCents <= input.currentBillCents) score += 8;
  }
  if (input.city && offer.city && normalize(offer.city) === normalize(input.city)) score += 12;
  if (input.need && offer.product && normalize(offer.product).includes(normalize(input.need))) score += 6;
  void rules;
  return score;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
