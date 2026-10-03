export interface InstagramProvider {
  connect(): Promise<{ ok: boolean }>;
  disconnect(): Promise<void>;
  publishPost(): Promise<{ id: string }>;
  getStatus(): Promise<{ ok: boolean; mode: "noop" }>;
}

export class NoopInstagramProvider implements InstagramProvider {
  async connect() {
    return { ok: false };
  }
  async disconnect() {}
  async publishPost() {
    return { id: "noop-instagram" };
  }
  async getStatus() {
    return { ok: false, mode: "noop" as const };
  }
}

export function getInstagramProvider() {
  return new NoopInstagramProvider();
}
