import type { Offer, OfferStatus } from "@prisma/client";
import type { OfferEngineInput } from "./select";
import { SalesChannelEligibilityService } from "./channel";

export function isOfferCommerciallyUsable(offer: Pick<Offer, "status" | "startsAt" | "endsAt">, now = new Date()) {
  if (offer.status !== "APROVADA") return false;
  if (offer.startsAt && offer.startsAt > now) return false;
  if (offer.endsAt && offer.endsAt < now) return false;
  return true;
}

export function cityMatches(offerCity: string | null, offerRegion: string | null, inputCity?: string | null) {
  if (!inputCity || !offerCity) return !offerCity || !inputCity;
  const a = normalize(offerCity);
  const b = normalize(inputCity);
  if (a.includes(b) || b.includes(a)) return true;
  if (offerRegion && normalize(offerRegion).includes(b)) return true;
  return false;
}

export function eligibilityAllows(eligibility: string | null | undefined, need?: string | null) {
  if (!eligibility || !need) return true;
  if (/somente móvel/i.test(eligibility) && /fibra|fixa/i.test(need)) return false;
  return true;
}

export function reasonNotEligible(offer: Offer, input: OfferEngineInput, now = new Date()): string | null {
  if (offer.status !== "APROVADA") return `${offer.id}: status ${offer.status}`;
  if (!isOfferCommerciallyUsable(offer, now)) return `${offer.id}: fora da vigência`;
  if (input.city && offer.city && !cityMatches(offer.city, offer.region, input.city)) {
    return `${offer.id}: cidade/região`;
  }
  if (!eligibilityAllows(offer.eligibility, input.need)) return `${offer.id}: elegibilidade`;
  if (input.acquisitionType && offer.acquisitionType && offer.acquisitionType !== input.acquisitionType) {
    return `${offer.id}: aquisicao ${offer.acquisitionType}`;
  }
  if (input.conversationChannel && !SalesChannelEligibilityService.allows(offer, input.conversationChannel)) {
    return `${offer.id}: canal ${input.conversationChannel}`;
  }
  if (input.category) {
    const want = input.category.toUpperCase();
    const got = (offer.categoryNormalized ?? offer.category ?? "").toUpperCase();
    if (want === "MOVEL" && got === "FIBRA") return `${offer.id}: categoria`;
    if (want === "FIBRA" && got === "MOVEL") return `${offer.id}: categoria`;
    if (want === "FWA" && got !== "FWA") return `${offer.id}: categoria`;
  }
  if ((offer.categoryNormalized === "FWA" || offer.category === "FWA") && !input.allowFwa && input.category !== "FWA") {
    return `${offer.id}: FWA exige regra de viabilidade`;
  }
  if (input.offerLevel && offer.offerLevel && normalize(offer.offerLevel) !== normalize(input.offerLevel)) {
    return `${offer.id}: nivel`;
  }
  if (input.maxPriceCents != null) {
    const price = offer.promotionalPriceCents ?? offer.priceCents;
    if (price != null && price > input.maxPriceCents) return `${offer.id}: orcamento`;
  }
  if (input.streaming) {
    const list = Array.isArray(offer.includedStreaming) ? (offer.includedStreaming as { provider?: string }[]) : [];
    const hit = list.some((s) => normalize(s.provider ?? "").includes(normalize(input.streaming!)));
    if (!hit) return `${offer.id}: streaming`;
  }
  return null;
}

export const NON_ENGINE_STATUSES: OfferStatus[] = ["DETECTADA", "AGUARDANDO_APROVACAO", "REJEITADA", "EXPIRADA"];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
