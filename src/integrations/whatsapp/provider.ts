export type WhatsAppInbound = {
  from: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  waMessageId: string;
  timestamp: string;
};

export interface WhatsAppProvider {
  readonly name: string;
  sendText(to: string, body: string): Promise<{ providerMessageId: string }>;
  sendTemplate(to: string, template: string, params: string[]): Promise<{ providerMessageId: string }>;
  testConnection(): Promise<{ ok: boolean; error?: string; phoneNumberId?: string }>;
}

function accessToken() {
  return process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || "";
}

function phoneNumberId() {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || "";
}

/** Simulador e desenvolvimento. Não é o canal oficial. */
export class DevMockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "dev_mock_whatsapp";

  async sendText(to: string) {
    return { providerMessageId: `mock-${to}-${Date.now()}` };
  }

  async sendTemplate(to: string, template: string) {
    return { providerMessageId: `mock-tpl-${template}-${to}-${Date.now()}` };
  }

  async testConnection() {
    return { ok: true, phoneNumberId: "mock" };
  }
}

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta_cloud_api";

  async sendText(to: string, body: string) {
    const token = accessToken();
    const phoneId = phoneNumberId();
    if (!token || !phoneId) {
      throw new Error("WhatsApp Cloud API não configurada.");
    }
    const digits = to.replace(/\D/g, "");
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body },
      }),
    });
    if (!res.ok) {
      throw new Error("Falha ao enviar mensagem WhatsApp Cloud API");
    }
    const json = (await res.json()) as { messages?: { id: string }[] };
    return { providerMessageId: json.messages?.[0]?.id ?? `wa-${Date.now()}` };
  }

  async sendTemplate(to: string, template: string, params: string[]) {
    const token = accessToken();
    const phoneId = phoneNumberId();
    if (!token || !phoneId) throw new Error("WhatsApp Cloud API não configurada.");
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/\D/g, ""),
        type: "template",
        template: {
          name: template,
          language: { code: "pt_BR" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
    });
    if (!res.ok) throw new Error("Falha ao enviar template WhatsApp");
    const json = (await res.json()) as { messages?: { id: string }[] };
    return { providerMessageId: json.messages?.[0]?.id ?? `wa-tpl-${Date.now()}` };
  }

  async testConnection() {
    const token = accessToken();
    const phoneId = phoneNumberId();
    if (!token || !phoneId) return { ok: false, error: "not_configured" };
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, error: "graph_error", phoneNumberId: phoneId };
    return { ok: true, phoneNumberId: phoneId };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const token = accessToken();
  if ((process.env.WHATSAPP_PROVIDER === "meta" || token) && token && phoneNumberId()) {
    return new MetaCloudWhatsAppProvider();
  }
  return new DevMockWhatsAppProvider();
}

export function maskId(value?: string | null) {
  if (!value) return "—";
  if (value.length < 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
