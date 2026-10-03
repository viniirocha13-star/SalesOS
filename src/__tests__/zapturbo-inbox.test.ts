import { describe, expect, it } from "vitest";
import { canSendFreeform } from "@/integrations/whatsapp/policy";
import { OPT_OUT_KEYWORDS } from "@/wa/opt-out";

describe("Janela de atendimento", () => {
  it("permite freeform dentro de 24h", () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000);
    expect(canSendFreeform(recent).freeform).toBe(true);
  });

  it("bloqueia freeform fora da janela", () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(canSendFreeform(old).freeform).toBe(false);
  });

  it("bloqueia sem inbound", () => {
    expect(canSendFreeform(null).freeform).toBe(false);
  });
});

describe("Opt-out keywords", () => {
  it("mantém lista mínima", () => {
    expect(OPT_OUT_KEYWORDS).toContain("SAIR");
    expect(OPT_OUT_KEYWORDS).toContain("STOP");
  });
});
