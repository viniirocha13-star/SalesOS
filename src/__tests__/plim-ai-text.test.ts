import { describe, expect, it } from "vitest";
import { AI_TEXT_PROHIBITIONS, buildImproveOfferTextPrompt } from "@/lib/plim/ai-text";

describe("plim ai-text prompt", () => {
  it("lista todas as proibições no prompt", () => {
    const prompt = buildImproveOfferTextPrompt({
      productName: "Tênis Runner",
      currentPrice: 199.9,
      discountPercent: 20,
      category: "TÊNIS",
    });
    for (const rule of AI_TEXT_PROHIBITIONS) {
      expect(prompt.toLowerCase()).toContain(rule.toLowerCase());
    }
    expect(prompt).toContain("Tênis Runner");
    expect(prompt).not.toContain("cupom inventado");
  });
});
