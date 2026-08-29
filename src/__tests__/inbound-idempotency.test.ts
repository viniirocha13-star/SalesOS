import { describe, expect, it } from "vitest";
import { extractWhatsAppEvents } from "@/integrations/whatsapp/parse";
import fixture from "./fixtures/whatsapp-inbound.json";

describe("idempotência de evento", () => {
  it("o mesmo wamid é a chave do evento", () => {
    const a = extractWhatsAppEvents(fixture)[0];
    const b = extractWhatsAppEvents(fixture)[0];
    expect(a.providerEventId).toBe(b.providerEventId);
    expect(a.wamid).toBe("wamid.TEST_MSG_1");
  });
});
