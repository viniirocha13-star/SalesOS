import { describe, expect, it } from "vitest";
import { resolvePlimProfile, canPlimWrite } from "@/lib/plim/profile";

describe("PLIM profiles", () => {
  it("mapeia papéis Sales OS para perfis PLIM", () => {
    expect(resolvePlimProfile("ADMIN")).toBe("ADMIN");
    expect(resolvePlimProfile("ANALISTA")).toBe("VISUALIZADOR");
    expect(resolvePlimProfile("OPERADOR")).toBe("OPERADOR");
  });

  it("respeita perfil explícito", () => {
    expect(resolvePlimProfile("OPERADOR", "VISUALIZADOR")).toBe("VISUALIZADOR");
  });

  it("operador pode editar", () => {
    expect(canPlimWrite("OPERADOR")).toBe(true);
    expect(canPlimWrite("VISUALIZADOR")).toBe(false);
  });
});
