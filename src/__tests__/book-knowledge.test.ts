import { describe, expect, it } from "vitest";
import {
  parseWorkbook,
  parseMoney,
  parseSpeedMbps,
  parseValidity,
  parsePricingPeriod,
  parseStreaming,
  parseAcquisition,
  parseChannel,
  channelAllows,
  parseFwaGb,
  parseFeatures,
} from "@/domain/book-parse";
import { readFileSync } from "fs";
import { join } from "path";
import { SalesChannelEligibilityService } from "@/offer-engine/channel";
import { validateCommercialClaims } from "@/commercial/claim-validator";
import type { CustomerOffer } from "@/offer-engine/customer-view";

describe("Book parser — Fortaleza", () => {
  const buf = readFileSync(join(process.cwd(), "fixtures/books/Ofertas_Brisanet_Fortaleza__CE_.xlsx"));
  const rows = parseWorkbook("Ofertas_Brisanet_Fortaleza__CE_.xlsx", buf);

  it("lê todas as abas e não descarta linhas", () => {
    const sheets = new Set(rows.map((r) => r.sourceSheet));
    expect([...sheets].sort()).toEqual(["COMBO", "FIBRA", "FWA", "MOVEL"]);
    expect(rows.length).toBeGreaterThan(15);
  });

  it("fibra 1 Giga vira 1000 Mbps", () => {
    expect(parseSpeedMbps("1 Giga", "FIBRA")).toBe(1000);
    const giga = rows.find((r) => r.planName === "1 Giga");
    expect(giga?.speedMbps).toBe(1000);
  });

  it("combo estrutura fibra + móvel", () => {
    const combo = rows.find((r) => r.planName === "500 Mega + 20GB");
    expect(combo?.isCombo).toBe(true);
    expect(combo?.speedMbps).toBe(500);
    expect(combo?.mobileDataGb).toBe(20);
    expect(combo?.categoryNormalized).toBe("COMBO");
  });

  it("móvel extrai GB e apps", () => {
    const movel = rows.find((r) => r.planName === "20GB");
    expect(movel?.mobileDataGb).toBe(20);
    expect(movel?.unlimitedApps).toContain("WhatsApp");
    expect(movel?.unlimitedCalls).toBe(true);
  });

  it("FWA não usa speed_mbps e converte 1TB", () => {
    expect(parseFwaGb("1TB", "FWA")).toBe(1024);
    const fwa = rows.find((r) => r.planName === "1TB");
    expect(fwa?.speedMbps).toBeNull();
    expect(fwa?.fwaAllowanceGb).toBe(1024);
    expect(fwa?.deviceLoan).toBe(true);
  });

  it("aquisição vs fidelização", () => {
    expect(parseAcquisition("aquisicao")).toBe("NEW_CUSTOMER");
    expect(parseAcquisition("fidelizacao")).toBe("RETENTION");
    const fid = rows.find((r) => r.offerLevel === "Nível 1" && r.categoryNormalized === "FIBRA");
    expect(fid?.acquisitionType).toBe("RETENTION");
  });

  it("canal exceto digital bloqueia WhatsApp/simulador", () => {
    const rule = parseChannel("todos, exceto digital");
    expect(channelAllows(rule, "SIMULATOR")).toBe(false);
    expect(channelAllows(rule, "WHATSAPP")).toBe(false);
    expect(SalesChannelEligibilityService.allows({ channelAllows: [], channelExcludes: rule.excludes, salesChannelRaw: rule.raw }, "SIMULATOR")).toBe(false);
    const ok = parseChannel("todos");
    expect(channelAllows(ok, "SIMULATOR")).toBe(true);
  });

  it("streaming Netflix / Amazon Prime / Não", () => {
    expect(parseStreaming("Não")).toEqual([]);
    expect(parseStreaming("Netflix Padrão com Anúncios")[0]?.provider).toBe("Netflix");
    expect(parseStreaming("Sky+ Light com Amazon Prime").map((s) => s.provider)).toEqual(
      expect.arrayContaining(["Sky+", "Amazon Prime"]),
    );
    const netflix = rows.filter((r) => r.includedStreaming.some((s) => s.provider === "Netflix"));
    expect(netflix.length).toBeGreaterThan(0);
  });

  it("preço promocional, futuro e vigência", () => {
    expect(parseMoney("R$ 99,99")).toBe(9999);
    const period = parsePricingPeriod("Por 12 meses, após R$ 119,89/mês", 11989);
    expect(period.months).toBe(12);
    expect(period.futurePriceCents).toBe(11989);
    const vig = parseValidity("DE 28/08/2026 ATÉ 30/09/2026");
    expect(vig.from?.toISOString().slice(0, 10)).toBe("2026-08-28");
    expect(vig.until?.toISOString().slice(0, 10)).toBe("2026-09-30");
    const fiber500 = rows.find((r) => r.planName === "500 Mega" && r.promotionalPriceCents === 9999);
    expect(fiber500?.promotionDurationMonths).toBe(12);
    expect(fiber500?.futurePriceCents).toBe(11989);
  });

  it("features estruturadas", () => {
    const f = parseFeatures("Instalação e Wi-Fi inclusos. 2GB de roaming. Aparelho em comodato");
    expect(f.installationIncluded).toBe(true);
    expect(f.wifiIncluded).toBe(true);
    expect(f.roamingGb).toBe(2);
    expect(f.deviceLoan).toBe(true);
  });

  it("não trata 500 Mega com streaming diferente como duplicata", () => {
    const five = rows.filter((r) => r.planName === "500 Mega" && r.city === "Fortaleza" && r.acquisitionType === "NEW_CUSTOMER");
    const prints = new Set(five.map((r) => r.fingerprint));
    expect(prints.size).toBe(five.length);
  });

  it("marca linha sem nome/preço como erro, sem descartar", () => {
    const bad = rows.find((r) => r.errors.includes("plano_sem_nome"));
    expect(bad).toBeTruthy();
    expect(rows.some((r) => r.errors.includes("preco_ausente"))).toBe(true);
  });
});

describe("CommercialClaimValidator", () => {
  const offer = {
    id: "1",
    name: "700 Mega",
    promotionalPriceCents: 12990,
    regularPriceCents: 14990,
    futurePriceCents: 14990,
    speedMbps: 700,
    includedStreaming: [{ provider: "Netflix", plan: "Padrão" }],
    unlimitedApps: ["WhatsApp"],
  } as CustomerOffer;

  it("bloqueia preço inventado e código operacional", () => {
    const bad = validateCommercialClaims("Fica R$ 10,00 e o código FIB700-FTZ", [offer]);
    expect(bad.ok).toBe(false);
    expect(bad.issues.some((i) => i.claim === "launch_code")).toBe(true);
  });

  it("aceita preço e Netflix do book", () => {
    const ok = validateCommercialClaims("700 Mega com Netflix por R$ 129,90. Depois R$ 149,90.", [offer]);
    expect(ok.ok).toBe(true);
  });

  it("não deixa afirmar consumo zero", () => {
    const bad = validateCommercialClaims("WhatsApp ilimitado, não gasta dados", [offer]);
    expect(bad.ok).toBe(false);
  });
});

