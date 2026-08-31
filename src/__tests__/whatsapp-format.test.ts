import { describe, expect, it } from "vitest";
import { parseWhatsAppMarkup, toWhatsAppMarkup } from "@/lib/whatsapp-format";

describe("WhatsApp markup", () => {
  it("converte **markdown** para *negrito* do WhatsApp", () => {
    const raw =
      "Encontrei estas opções:\n- **500 Mega + 20 GB:** R$ 99,99/mês";
    expect(toWhatsAppMarkup(raw)).toBe("Encontrei estas opções:\n- *500 Mega + 20 GB:* R$ 99,99/mês");
    expect(toWhatsAppMarkup(raw)).not.toContain("**");
  });

  it("parseia *negrito* para render", () => {
    const runs = parseWhatsAppMarkup("*500 Mega + 20 GB:* R$ 99,99");
    expect(runs.some((r) => r.bold && r.text.includes("500 Mega"))).toBe(true);
  });
});
