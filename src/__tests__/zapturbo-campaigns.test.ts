import { describe, expect, it } from "vitest";
import { validateTemplateLocal } from "@/wa/templates";
import { isOptOutText } from "@/wa/opt-out";
import { waBackoffStrategy } from "@/workers/wa/queue";
import { applyExampleValues } from "@/lib/template-preview";
import { translateMetaError, isTemporaryMetaError, isPermanentSendFailure } from "@/integrations/meta/errors";
import { filterToWhere } from "@/wa/segments";

describe("Template validator", () => {
  it("exige variáveis sequenciais e exemplos", () => {
    const bad = validateTemplateLocal({
      name: "pedido_ok",
      category: "UTILITY",
      body: "Olá {{1}}, pedido {{3}}",
      exampleValues: ["A"],
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.some((e) => e.includes("sequenciais") || e.includes("exemplo"))).toBe(true);
  });

  it("aceita template válido", () => {
    const ok = validateTemplateLocal({
      name: "pedido_atualizado",
      category: "UTILITY",
      body: "Olá {{1}}. Pedido {{2}}.",
      exampleValues: ["Maria", "#1"],
    });
    expect(ok.ok).toBe(true);
    expect(ok.variables).toEqual([1, 2]);
  });

  it("alerta marketing disfarçado de utilidade", () => {
    const r = validateTemplateLocal({
      name: "promo_util",
      category: "UTILITY",
      body: "Aproveite nosso desconto especial hoje!",
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("Opt-out", () => {
  it("detecta palavras-chave", () => {
    expect(isOptOutText("SAIR")).toBe(true);
    expect(isOptOutText("parar")).toBe(true);
    expect(isOptOutText("stop agora")).toBe(true);
    expect(isOptOutText("quero continuar")).toBe(false);
  });
});

describe("Retry backoff", () => {
  it("usa 0 / 30s / 2min / 10min", () => {
    expect(waBackoffStrategy(0)).toBe(0);
    expect(waBackoffStrategy(1)).toBe(30_000);
    expect(waBackoffStrategy(2)).toBe(120_000);
    expect(waBackoffStrategy(3)).toBe(600_000);
  });
});

describe("Meta errors", () => {
  it("traduz códigos conhecidos", () => {
    expect(translateMetaError({ code: 132001 })).toMatch(/template/i);
    expect(isTemporaryMetaError(130429)).toBe(true);
    expect(isPermanentSendFailure(132007)).toBe(true);
  });
});

describe("Preview e segmentos", () => {
  it("aplica exemplos no corpo", () => {
    expect(applyExampleValues("Oi {{1}}", ["Ana"])).toBe("Oi Ana");
  });

  it("monta where de segmento com opt-out excluído", () => {
    const where = filterToWhere("org1", { tag: "cliente", lastInteractionBeforeDays: 30 });
    expect(where.organizationId).toBe("org1");
    expect(where.optedOutAt).toBeNull();
    expect(where.tags).toBeTruthy();
  });
});
