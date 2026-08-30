import type { AcquisitionType, Offer } from "@prisma/client";

export type CustomerOffer = {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  acquisitionType: AcquisitionType | null;
  offerLevel: string | null;
  isCombo: boolean;
  speedMbps: number | null;
  mobileDataGb: number | null;
  fwaAllowanceGb: number | null;
  promotionalPriceCents: number | null;
  regularPriceCents: number | null;
  futurePriceCents: number | null;
  promotionDurationMonths: number | null;
  pricingPeriodDescription: string | null;
  includedStreaming: { provider: string; plan: string | null }[];
  unlimitedApps: string[];
  includedProducts: string[];
  installationIncluded: boolean | null;
  wifiIncluded: boolean | null;
  unlimitedCalls: boolean | null;
  unlimitedSms: boolean | null;
  roamingGb: number | null;
  deviceLoan: boolean | null;
  validFrom: Date | null;
  validUntil: Date | null;
  benefits: string[];
  source?: { bookId: string | null; sheet: string | null; row: number | null; offerId: string };
};

export function toCustomerOffer(offer: Offer, withSource = false): CustomerOffer {
  const streaming = Array.isArray(offer.includedStreaming)
    ? (offer.includedStreaming as { provider: string; plan: string | null }[])
    : [];
  return {
    id: offer.id,
    name: offer.name,
    category: offer.categoryNormalized ?? offer.category,
    city: offer.city,
    acquisitionType: offer.acquisitionType,
    offerLevel: offer.offerLevel,
    isCombo: offer.isCombo,
    speedMbps: offer.speedMbps,
    mobileDataGb: offer.mobileDataGb,
    fwaAllowanceGb: offer.fwaAllowanceGb,
    promotionalPriceCents: offer.promotionalPriceCents,
    regularPriceCents: offer.priceCents,
    futurePriceCents: offer.futurePriceCents,
    promotionDurationMonths: offer.promotionDurationMonths,
    pricingPeriodDescription: offer.pricingPeriodDescription ?? offer.promotionalPeriod,
    includedStreaming: streaming,
    unlimitedApps: offer.unlimitedApps ?? [],
    includedProducts: offer.includedProducts ?? [],
    installationIncluded: offer.installationIncluded,
    wifiIncluded: offer.wifiIncluded,
    unlimitedCalls: offer.unlimitedCalls,
    unlimitedSms: offer.unlimitedSms,
    roamingGb: offer.roamingGb,
    deviceLoan: offer.deviceLoan,
    validFrom: offer.startsAt,
    validUntil: offer.endsAt,
    benefits: (offer.benefits ?? []).slice(0, 8),
    source: withSource
      ? { bookId: offer.bookId, sheet: offer.sourceSheet, row: offer.sourceRow, offerId: offer.id }
      : undefined,
  };
}

export function stripLaunchCodes<T extends { launchCodes?: string | null }>(offer: T) {
  const { launchCodes: _ignored, ...rest } = offer;
  void _ignored;
  return rest;
}
