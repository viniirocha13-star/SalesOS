import { describe, expect, it } from "vitest";
import { parseLatLng } from "@/integrations/geocode/provider";
import { mapOfficialPayload, officialViabilityConfigured } from "@/integrations/viability/official";
import { OfficialOrOperatorViabilityProvider } from "@/integrations/viability/provider";

describe("Viabilidade: geocode + API oficial ou fila", () => {
  it("extrai lat/lng de texto de localização", () => {
    const p = parseLatLng("Localização: -3.73186, -38.52667");
    expect(p?.latitude).toBeCloseTo(-3.73186);
    expect(p?.longitude).toBeCloseTo(-38.52667);
  });

  it("mapeia resposta oficial para VIAVEL/NÃO", () => {
    expect(mapOfficialPayload({ viable: true })?.result).toBe("VIAVEL");
    expect(mapOfficialPayload({ available: false })?.result).toBe("NAO_VIAVEL");
    expect(mapOfficialPayload({ coverage: { status: "available" } })?.result).toBe("VIAVEL");
    expect(mapOfficialPayload({ foo: 1 })).toBeNull();
  });

  it("sem API oficial não afirma cobertura — fila o operador", async () => {
    delete process.env.BRISANET_VIABILITY_URL;
    delete process.env.BRISANET_VIABILITY_TOKEN;
    expect(officialViabilityConfigured()).toBe(false);
    const out = await new OfficialOrOperatorViabilityProvider().check({
      address: "Rua Teste 10",
      city: "Maranguape",
    });
    expect(out.result).toBe("INDETERMINADO");
    expect(out.reliable).toBe(false);
    expect(out.details.queued).toBe(true);
    expect(out.details.latitude).toBeTruthy();
    expect(out.source).toBe("geocode_operator_queue");
  });
});
