export interface TelegramProvider {
  connect(): Promise<{ ok: boolean; error?: string }>;
  disconnect(): Promise<void>;
  sendMessage(chatId: string, text: string): Promise<{ id: string }>;
  getStatus(): Promise<{ ok: boolean; mode: "api" | "noop"; error?: string }>;
}

export class TelegramBotProvider implements TelegramProvider {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async connect() {
    return this.getStatus();
  }

  async disconnect() {}

  async sendMessage(chatId: string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const json = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!json.ok) throw new Error(json.description ?? "Falha ao enviar no Telegram");
    return { id: String(json.result?.message_id ?? Date.now()) };
  }

  async getStatus() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/getMe`);
      const json = (await res.json()) as { ok: boolean; description?: string };
      return { ok: json.ok, mode: "api" as const, error: json.ok ? undefined : json.description };
    } catch (e) {
      return { ok: false, mode: "api" as const, error: e instanceof Error ? e.message : String(e) };
    }
  }
}

export class NoopTelegramProvider implements TelegramProvider {
  async connect() {
    return { ok: false, error: "Telegram não configurado" };
  }
  async disconnect() {}
  async sendMessage(_chatId: string, _text: string): Promise<{ id: string }> {
    throw new Error("Telegram não configurado. Defina TELEGRAM_BOT_TOKEN.");
  }
  async getStatus() {
    return { ok: false, mode: "noop" as const, error: "Telegram não configurado" };
  }
}

export function getTelegramProvider(tokenOverride?: string) {
  const token = tokenOverride?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (token) return new TelegramBotProvider(token);
  return new NoopTelegramProvider();
}
