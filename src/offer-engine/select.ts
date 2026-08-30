import { prisma } from "@/lib/prisma";
import type { AcquisitionType, Offer } from "@prisma/client";
import { reasonNotEligible } from "./eligibility";
import { toCustomerOffer } from "./customer-view";

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
  conversationChannel?: string | null;
  acquisitionType?: AcquisitionType | null;
  category?: string | null;
  allowFwa?: boolean;
  streaming?: string | null;
  maxPriceCents?: number | null;
  offerLevel?: string | null;
  wantsChip?: boolean;
  wantsStreaming?: boolean;
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
    bookId?: string | null;
  };
};

export async function selectOffers(input: OfferEngineInput): Promise<OfferEngineOutput> {
  const now = new Date();
  const activeBooks = await prisma.offerBook.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  const candidates = await prisma.offer.findMany({
    where: {
      status: "APROVADA",
      ...(activeBooks.length ? { bookId: { in: activeBooks.map((b) => b.id) } } : {}),
    },
  });

  const rules: string[] = [
    "somente book ACTIVE",
    "somente ofertas APROVADAS e vigentes",
    "filtro de cidade/região quando informado",
    "canal de venda do book",
    "aquisição vs fidelização",
    "IA não recebe ofertas inelegíveis",
    "sem mapeamento inventado de velocidade por quantidade de pessoas",
  ];
  const rejected: string[] = [];
  const eligible = candidates.filter((offer) => {
    const reason = reasonNotEligible(offer, input, now);
    if (reason) {
      rejected.push(reason);
      return false;
    }
    return true;
  });

  const scored = eligible
    .map((offer) => ({ offer, score: scoreOffer(offer, input) }))
    .sort((a, b) => b.score - a.score);

  const fibra = scored.filter((s) => (s.offer.categoryNormalized ?? s.offer.category ?? "").toUpperCase() === "FIBRA");
  const combo = scored.filter((s) => s.offer.isCombo || (s.offer.categoryNormalized ?? "").toUpperCase() === "COMBO");
  const mobile = scored.filter((s) => (s.offer.categoryNormalized ?? "").toUpperCase() === "MOVEL");

  const preferred = input.wantsChip ? combo : input.category === "MOVEL" ? mobile : fibra.length ? fibra : scored;
  const best = (preferred[0] ?? scored[0])?.offer ?? null;
  const alternative = (preferred[1] ?? scored[1])?.offer ?? null;
  const upsell = preferred.find((s) => s.offer.id !== best?.id && (s.offer.speedMbps ?? 0) > (best?.speedMbps ?? 0))?.offer ?? null;
  const cross = input.mobileInterest !== false ? (combo[0]?.offer ?? mobile[0]?.offer ?? null) : null;

  return {
    best_offer: best,
    alternative_offer: alternative && alternative.id !== best?.id ? alternative : null,
    upsell: upsell && upsell.id !== best?.id ? upsell : null,
    cross_sell: cross && cross.id !== best?.id ? cross : null,
    reasoning_metadata: {
      rules,
      rejected: rejected.slice(0, 20),
      eligibleCount: eligible.length,
      bookId: activeBooks[0]?.id ?? null,
    },
  };
}

export async function searchProducts(input: OfferEngineInput & { take?: number }) {
  const ranking = await selectOffers(input);
  const list = [ranking.best_offer, ranking.alternative_offer, ranking.upsell, ranking.cross_sell].filter(Boolean) as Offer[];
  return {
    offers: list.slice(0, input.take ?? 4).map((o) => toCustomerOffer(o)),
    reasoning_metadata: ranking.reasoning_metadata,
    policy: "somente book ACTIVE + APROVADA + vigente + canal/aquisição",
  };
}

function scoreOffer(offer: Offer, input: OfferEngineInput): number {
  let score = 10;
  if (input.city && offer.city && normalize(offer.city) === normalize(input.city)) score += 12;
  if (input.need && offer.product && normalize(offer.product).includes(normalize(input.need))) score += 6;
  if (input.wantsChip && offer.isCombo) score += 14;
  if (input.streaming) {
    const list = Array.isArray(offer.includedStreaming) ? (offer.includedStreaming as { provider?: string }[]) : [];
    if (list.some((s) => normalize(s.provider ?? "").includes(normalize(input.streaming!)))) score += 16;
  }
  if (input.currentBillCents && offer.promotionalPriceCents) {
    if (offer.promotionalPriceCents <= input.currentBillCents) score += 8;
  }
  if (input.preferences && /netflix/i.test(input.preferences)) {
    const list = Array.isArray(offer.includedStreaming) ? (offer.includedStreaming as { provider?: string }[]) : [];
    if (list.some((s) => /netflix/i.test(s.provider ?? ""))) score += 10;
  }
  return score;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
