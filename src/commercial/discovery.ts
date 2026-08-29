export type DiscoveryFlags = {
  missing_critical_information: string[];
  can_check_viability: boolean;
  can_search_offers: boolean;
  can_present_offer: boolean;
  can_collect_data: boolean;
};

export function evaluateDiscovery(input: {
  city?: string | null;
  need?: string | null;
  address?: string | null;
  currentBill?: string | null;
  hasEligibleOffers: boolean;
  hasAcceptance: boolean;
  viabilityKnown: boolean;
}): DiscoveryFlags {
  const missing: string[] = [];
  if (!input.city) missing.push("city");
  if (!input.need) missing.push("product_interest");
  if (input.hasAcceptance && !input.address) missing.push("address");
  return {
    missing_critical_information: missing,
    can_check_viability: Boolean(input.city || input.address),
    can_search_offers: Boolean(input.city || input.need),
    can_present_offer: input.hasEligibleOffers,
    can_collect_data: input.hasAcceptance,
  };
}
