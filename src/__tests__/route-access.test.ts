import { describe, expect, it } from "vitest";
import { canAccessPath } from "@/lib/route-access";

describe("RBAC por URL", () => {
  it("analista não acessa operação nem inbox", () => {
    expect(canAccessPath("ANALISTA", "/operacao")).toBe(false);
    expect(canAccessPath("ANALISTA", "/inbox")).toBe(false);
    expect(canAccessPath("ANALISTA", "/dashboard")).toBe(true);
    expect(canAccessPath("ANALISTA", "/leads")).toBe(true);
    expect(canAccessPath("ANALISTA", "/pos-venda")).toBe(true);
  });

  it("operador acessa fila e inbox, não admin", () => {
    expect(canAccessPath("OPERADOR", "/operacao")).toBe(true);
    expect(canAccessPath("OPERADOR", "/inbox")).toBe(true);
    expect(canAccessPath("OPERADOR", "/pos-venda")).toBe(true);
    expect(canAccessPath("OPERADOR", "/admin")).toBe(false);
  });

  it("analista não acessa home nem laboratório", () => {
    expect(canAccessPath("ANALISTA", "/home")).toBe(false);
    expect(canAccessPath("ANALISTA", "/conversas")).toBe(false);
    expect(canAccessPath("ANALISTA", "/pos-venda")).toBe(true);
  });

  it("supervisor acessa diagnóstico, não é tratado como deslogado", () => {
    expect(canAccessPath("SUPERVISOR", "/admin/diagnostico")).toBe(true);
  });
});
