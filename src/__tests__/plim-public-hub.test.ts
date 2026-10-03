import { describe, expect, it } from "vitest";
import { resolveAffiliateEnv } from "@/lib/plim/workspace-env";

describe("PLIM workspace env", () => {
  it("prioriza override do workspace sobre env", () => {
    const prev = process.env.PLIM_AMAZON_TAG;
    process.env.PLIM_AMAZON_TAG = "env-tag";
    expect(resolveAffiliateEnv("PLIM_AMAZON_TAG", { PLIM_AMAZON_TAG: "db-tag" })).toBe("db-tag");
    process.env.PLIM_AMAZON_TAG = prev;
  });
});
