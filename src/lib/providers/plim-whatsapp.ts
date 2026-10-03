import { getWhatsAppProvider } from "@/integrations/whatsapp/provider";

export type PlimWhatsAppStatus = {
  connected: boolean;
  label: string;
  error?: string;
};

export interface PlimWhatsAppProvider {
  connect(): Promise<PlimWhatsAppStatus>;
  disconnect(): Promise<void>;
  sendMessage(to: string, text: string): Promise<{ id: string }>;
  sendImage(to: string, imageUrl: string, caption?: string): Promise<{ id: string }>;
  getStatus(): Promise<PlimWhatsAppStatus>;
}

export class MetaPlimWhatsAppProvider implements PlimWhatsAppProvider {
  private inner = getWhatsAppProvider();

  async connect() {
    const t = await this.inner.testConnection();
    return { connected: t.ok, label: this.inner.name, error: t.error };
  }

  async disconnect() {
    // Cloud API: desconexão é operacional (tokens), não há socket
  }

  async sendMessage(to: string, text: string) {
    const r = await this.inner.sendText(to, text);
    return { id: r.providerMessageId };
  }

  async sendImage(to: string, imageUrl: string, caption?: string) {
    const body = caption ? `${caption}\n${imageUrl}` : imageUrl;
    const r = await this.inner.sendText(to, body);
    return { id: r.providerMessageId };
  }

  async getStatus() {
    return this.connect();
  }
}

export function getPlimWhatsAppProvider(): PlimWhatsAppProvider {
  return new MetaPlimWhatsAppProvider();
}
