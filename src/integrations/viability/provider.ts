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

/** Base interna autorizada — cidades de cobertura cadastradas no seed/config. Sem scraping. */
export class InternalAuthorizedViabilityProvider implements ViabilityProvider {
  readonly name = "internal_authorized";
  constructor(private coveredCities: Set<string>) {}

  async check(input: ViabilityInput): Promise<ViabilityOutput> {
    const city = input.city?.trim().toLowerCase();
    if (!city) {
      return {
        result: "INDETERMINADO",
        source: this.name,
        reliable: false,
        details: { reason: "cidade_ausente" },
      };
    }
    const covered = this.coveredCities.has(city);
    return {
      result: covered ? "VIAVEL" : "INDETERMINADO",
      source: this.name,
      reliable: covered,
      details: { city },
    };
  }
}

/** Consulta manual pelo operador — única forma positiva sem API oficial. */
export class ManualOperatorViabilityProvider implements ViabilityProvider {
  readonly name = "manual_operator";

  async check(): Promise<ViabilityOutput> {
    return {
      result: "INDETERMINADO",
      source: this.name,
      reliable: false,
      details: { reason: "aguardando_consulta_manual" },
    };
  }
}

const COVERED = new Set(
  [
    "fortaleza",
    "caucaia",
    "maracanaú",
    "maracanau",
    "juazeiro do norte",
    "sobral",
    "mossoró",
    "mossoro",
    "natal",
    "joão pessoa",
    "joao pessoa",
    "campina grande",
    "recife",
    "caruaru",
  ].map((c) => c.toLowerCase()),
);

export function getViabilityProvider(): ViabilityProvider {
  const mode = process.env.VIABILITY_PROVIDER ?? "internal";
  if (mode === "manual") return new ManualOperatorViabilityProvider();
  return new InternalAuthorizedViabilityProvider(COVERED);
}
