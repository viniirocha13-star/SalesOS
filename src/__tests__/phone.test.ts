import { describe, expect, it } from "vitest";
import { normalizePhone, phonesMatch } from "@/lib/phone";

describe("PhoneNormalizer", () => {
  it("converte local BR para E.164", () => {
    expect(normalizePhone("(85) 99100-0001")).toBe("+5585991000001");
    expect(normalizePhone("85991000001")).toBe("+5585991000001");
  });

  it("não duplica +55", () => {
    expect(normalizePhone("+55 85 99100-0001")).toBe("+5585991000001");
    expect(normalizePhone("5585991000001")).toBe("+5585991000001");
  });

  it("compara formatos diferentes", () => {
    expect(phonesMatch("85 99100-0001", "+5585991000001")).toBe(true);
  });
});
