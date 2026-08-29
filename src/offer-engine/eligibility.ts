import type { Offer, OfferStatus } from "@prisma/client";
import type { OfferEngineInput } from "./select";

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

export function reasonNotEligible(
  offer: Pick<Offer, "id" | "status" | "startsAt" | "endsAt" | "city" | "region" | "eligibility">,
  input: OfferEngineInput,
  now = new Date(),
): string | null {
  if (offer.status !== "APROVADA") return `${offer.id}: status ${offer.status}`;
  if (!isOfferCommerciallyUsable(offer, now)) return `${offer.id}: fora da vigência`;
  if (input.city && offer.city && !cityMatches(offer.city, offer.region, input.city)) {
    return `${offer.id}: cidade/região`;
  }
  if (!eligibilityAllows(offer.eligibility, input.need)) return `${offer.id}: elegibilidade`;
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
