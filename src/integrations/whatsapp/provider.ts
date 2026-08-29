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
}

export class MetaCloudWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta_cloud_api";

  async sendText(to: string, body: string) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) {
      throw new Error("WhatsApp Cloud API não configurada. Use WHATSAPP_PROVIDER=mock até as credenciais oficiais.");
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
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
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) {
      throw new Error("WhatsApp Cloud API não configurada.");
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: params.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });
    if (!res.ok) throw new Error("Falha ao enviar template WhatsApp");
    const json = (await res.json()) as { messages?: { id: string }[] };
    return { providerMessageId: json.messages?.[0]?.id ?? `wa-tpl-${Date.now()}` };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === "meta" && process.env.WHATSAPP_TOKEN) {
    return new MetaCloudWhatsAppProvider();
  }
  return new DevMockWhatsAppProvider();
}
