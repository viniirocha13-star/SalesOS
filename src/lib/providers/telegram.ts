export interface TelegramProvider {
  connect(): Promise<{ ok: boolean }>;
  disconnect(): Promise<void>;
  sendMessage(_chatId: string, _text: string): Promise<{ id: string }>;
  getStatus(): Promise<{ ok: boolean; mode: "noop" }>;
}

export class NoopTelegramProvider implements TelegramProvider {
  async connect() {
    return { ok: false };
  }
  async disconnect() {}
  async sendMessage() {
    return { id: "noop-telegram" };
  }
  async getStatus() {
    return { ok: false, mode: "noop" as const };
  }
}

export function getTelegramProvider() {
  return new NoopTelegramProvider();
}
