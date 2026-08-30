import { fold } from "@/lib/text-norm";
import type { AcquisitionType } from "@prisma/client";
import { selectOffers, type OfferEngineInput } from "@/offer-engine/select";
import { toCustomerOffer } from "@/offer-engine/customer-view";
import { retrieveProductKnowledge } from "@/commercial/product-knowledge";

export type CustomerProfile = {
  household_size: number | null;
  usage_streaming: string | null;
  usage_gaming: string | null;
  usage_home_office: string | null;
  usage_social: string | null;
  usage_mobile: string | null;
  budget: string | null;
  current_provider: string | null;
  current_price: string | null;
  desired_product: string | null;
  portability_interest: string | null;
};

export function profileFromFacts(facts: Record<string, string | undefined>, extras?: { users?: number | null; productInterest?: string | null; currentBill?: string | null }) {
  return {
    household_size: num(facts.household_size) ?? extras?.users ?? null,
    usage_streaming: facts.usage_streaming ?? null,
    usage_gaming: facts.usage_gaming ?? null,
    usage_home_office: facts.usage_home_office ?? null,
    usage_social: facts.usage_social ?? null,
    usage_mobile: facts.usage_mobile ?? null,
    budget: facts.budget ?? extras?.currentBill ?? null,
    current_provider: facts.current_provider ?? null,
    current_price: facts.current_bill ?? facts.current_price ?? extras?.currentBill ?? null,
    desired_product: facts.desired_product ?? extras?.productInterest ?? null,
    portability_interest: facts.portability_interest ?? null,
  } satisfies CustomerProfile;
}

export async function buildSalesContext(input: {
  city?: string | null;
  conversationChannel: string;
  facts: Record<string, string | undefined>;
  latestInbound: string;
  viabilityAllowFwa?: boolean;
  offerLevel?: string | null;
}) {
  const text = fold(input.latestInbound);
  const profile = profileFromFacts(input.facts);
  const category = inferCategory(text, profile.desired_product);
  const engineInput: OfferEngineInput = {
    city: input.city,
    conversationChannel: input.conversationChannel,
    acquisitionType: inferAcquisition(text, profile) ,
    category,
    allowFwa: Boolean(input.viabilityAllowFwa) || category === "FWA",
    streaming: inferStreaming(text, profile.usage_streaming),
    wantsChip: /chip|movel|móvel|celular/.test(text) || Boolean(profile.usage_mobile),
    wantsStreaming: /netflix|globoplay|sky|prime|stream/.test(text) || Boolean(profile.usage_streaming),
    need: profile.desired_product ?? category ?? undefined,
    offerLevel: input.offerLevel,
    currentBillCents: money(profile.current_price ?? profile.budget),
    users: profile.household_size,
    preferences: input.latestInbound,
  };
  const ranking = await selectOffers(engineInput);
  const knowledge = await retrieveProductKnowledge(input.latestInbound, 3);
  return {
    profile,
    engineInput,
    ranking,
    eligible_offers: [ranking.best_offer, ranking.alternative_offer, ranking.upsell]
      .filter(Boolean)
      .map((o) => toCustomerOffer(o!)),
    recommended_offer: ranking.best_offer ? toCustomerOffer(ranking.best_offer) : null,
    alternative_offers: [ranking.alternative_offer, ranking.upsell, ranking.cross_sell]
      .filter((o) => o && o.id !== ranking.best_offer?.id)
      .slice(0, 3)
      .map((o) => toCustomerOffer(o!)),
    relevant_product_knowledge: knowledge,
  };
}

function inferCategory(text: string, desired?: string | null) {
  const blob = fold(`${text} ${desired ?? ""}`);
  if (/so chip|só chip|so celular|apenas movel|plano movel/.test(blob)) return "MOVEL";
  if (/fwa|sem cabo/.test(blob)) return "FWA";
  if (/chip|combo/.test(blob) && /internet|casa|fibra/.test(blob)) return "COMBO";
  if (/internet|casa|fibra|wifi|wi-fi/.test(blob)) return "FIBRA";
  return null;
}

function inferStreaming(text: string, usage?: string | null) {
  const blob = fold(`${text} ${usage ?? ""}`);
  if (/netflix/.test(blob)) return "Netflix";
  if (/globoplay/.test(blob)) return "Globoplay";
  if (/amazon|prime/.test(blob)) return "Amazon Prime";
  if (/sky/.test(blob)) return "Sky+";
  return null;
}

function inferAcquisition(text: string, profile: CustomerProfile): AcquisitionType | null {
  if (/ja sou cliente|já sou cliente|fideliz|migrar meu plano/.test(fold(text))) return "RETENTION";
  if (profile.current_provider && /brisanet/.test(fold(profile.current_provider))) return "RETENTION";
  if (/quero internet|cliente novo|ainda nao tenho/.test(fold(text))) return "NEW_CUSTOMER";
  return "NEW_CUSTOMER";
}

function num(v?: string) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function money(v?: string | null) {
  if (!v) return null;
  const n = Number(String(v).replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? (n < 1000 ? n * 100 : n) : null;
}
