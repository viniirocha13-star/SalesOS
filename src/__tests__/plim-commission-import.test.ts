import { describe, expect, it } from "vitest";
import { parseCommissionSheetRows } from "@/lib/plim/commission-import";

describe("commission import parser", () => {
  it("mapeia colunas em português", () => {
    const rows = parseCommissionSheetRows(
      [
        {
          Pedido: "ORD-1",
          Produto: "Fone XYZ",
          Valor: "199,90",
          Comissão: "15,50",
          "Sub ID": "grp-fitness",
          Data: "03/10/2026",
          Marketplace: "Shopee",
        },
      ],
      "OUTRO",
    );
    expect(rows[0].errors).toHaveLength(0);
    expect(rows[0].orderId).toBe("ORD-1");
    expect(rows[0].amount).toBeCloseTo(199.9, 1);
    expect(rows[0].commission).toBeCloseTo(15.5, 1);
    expect(rows[0].subId).toBe("grp-fitness");
    expect(rows[0].marketplace).toBe("SHOPEE");
  });

  it("marca linha inválida sem comissão", () => {
    const rows = parseCommissionSheetRows([{ Valor: "10" }], "AMAZON");
    expect(rows[0].errors.length).toBeGreaterThan(0);
  });
});
