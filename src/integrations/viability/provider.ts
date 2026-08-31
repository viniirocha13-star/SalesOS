import { geocodeAddress } from "@/integrations/geocode/provider";
import { checkOfficialViability, officialViabilityConfigured } from "@/integrations/viability/official";

export type ViabilityInput = {
  address?: string;
  zipCode?: string;
  city?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
};

export type ViabilityOutput = {
  result: "VIAVEL" | "NAO_VIAVEL" | "INDETERMINADO";
  source: string;
  details: Record<string, unknown>;
  reliable: boolean;
};

export interface ViabilityProvider {
  readonly name: string;
  check(input: ViabilityInput): Promise<ViabilityOutput>;
}

export class OfficialOrOperatorViabilityProvider implements ViabilityProvider {
  readonly name = "official_or_operator";

  async check(input: ViabilityInput): Promise<ViabilityOutput> {
    const geo = await geocodeAddress(input);
    const withGeo: ViabilityInput = {
      ...input,
      latitude: geo?.latitude ?? input.latitude,
      longitude: geo?.longitude ?? input.longitude,
    };
    const geoDetails = geo
      ? { latitude: geo.latitude, longitude: geo.longitude, geocode_source: geo.source, label: geo.label }
      : { geocode_source: "none" };

    if (officialViabilityConfigured()) {
      try {
        const official = await checkOfficialViability(withGeo);
        return {
          ...official,
          details: { ...official.details, ...geoDetails, queued: official.reliable ? false : true },
        };
      } catch {
        return {
          result: "INDETERMINADO",
          source: "official_api_failed",
          reliable: false,
          details: { ...geoDetails, queued: true, reason: "falha_api_oficial" },
        };
      }
    }

    return {
      result: "INDETERMINADO",
      source: "geocode_operator_queue",
      reliable: false,
      details: {
        ...geoDetails,
        queued: true,
        reason: "sem_api_oficial",
        operator_hint: "Olhar a caixa no sistema Brisanet com lat/lng",
      },
    };
  }
}

export function getViabilityProvider(): ViabilityProvider {
  return new OfficialOrOperatorViabilityProvider();
}
