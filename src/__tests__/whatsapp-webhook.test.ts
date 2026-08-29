import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { extractWhatsAppEvents } from "@/integrations/whatsapp/parse";
import { verifyMetaSignature } from "@/integrations/whatsapp/signature";
import fixture from "./fixtures/whatsapp-inbound.json";

describe("WhatsApp webhook parse", () => {
  it("extrai mensagem de texto", () => {
    const events = extractWhatsAppEvents(fixture);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("message");
    expect(events[0].from).toBe("5585991000099");
    expect(events[0].text).toBe("Oi, quero internet em Caucaia");
    expect(events[0].phoneNumberId).toBe("123456789");
    expect(events[0].wamid).toBe("wamid.TEST_MSG_1");
  });

  it("extrai status", () => {
    const events = extractWhatsAppEvents({
      entry: [
        {
          changes: [{ value: { statuses: [{ id: "wamid.OUT", status: "delivered", recipient_id: "5585" }] } }],
        },
      ],
    });
    expect(events[0].kind).toBe("status");
    expect(events[0].status).toBe("delivered");
  });

  it("payload inválido não explode", () => {
    expect(extractWhatsAppEvents({})).toEqual([]);
    expect(extractWhatsAppEvents(null)).toEqual([]);
  });
});

describe("assinatura Meta", () => {
  it("aceita HMAC válido", () => {
    const raw = '{"ok":true}';
    const secret = "app-secret";
    const header = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifyMetaSignature(raw, header, secret)).toBe(true);
  });

  it("rejeita HMAC inválido", () => {
    expect(verifyMetaSignature("{}", "sha256=deadbeef", "app-secret")).toBe(false);
    expect(verifyMetaSignature("{}", null, "app-secret")).toBe(false);
  });
});
