import { describe, expect, it } from "vitest";
import { buildExclusionSet, filterImportableContacts, isPhoneExcluded } from "@/lib/plim/opt-out";

describe("plim opt-out", () => {
  it("bloqueia reimportação de telefone excluído", () => {
    const excluded = buildExclusionSet(["(11) 98888-7777"]);
    expect(isPhoneExcluded("11988887777", excluded)).toBe(true);
    const { accepted, blocked } = filterImportableContacts(
      [{ phone: "+5511988887777" }, { phone: "+5511977776666" }],
      excluded,
    );
    expect(blocked).toHaveLength(1);
    expect(accepted).toHaveLength(1);
  });
});
