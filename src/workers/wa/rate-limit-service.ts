import { getRedis } from "@/workers/queue";
import { logInfo } from "@/lib/logger";

/**
 * Rate limit dinâmico por phone_number_id.
 * Reduz velocidade automaticamente em erros 130429 / 131056 / 429.
 */
export class RateLimitService {
  constructor(
    private phoneNumberId: string,
    private organizationId: string,
  ) {}

  private key() {
    return `wa:rate:${this.organizationId}:${this.phoneNumberId}`;
  }

  private async state(): Promise<{ rate: number; updatedAt: number }> {
    const raw = await getRedis().get(this.key());
    if (!raw) {
      return {
        rate: Number(process.env.WA_SEND_RATE_DEFAULT ?? 10),
        updatedAt: Date.now(),
      };
    }
    try {
      return JSON.parse(raw) as { rate: number; updatedAt: number };
    } catch {
      return { rate: Number(process.env.WA_SEND_RATE_DEFAULT ?? 10), updatedAt: Date.now() };
    }
  }

  private async save(rate: number) {
    const max = Number(process.env.WA_SEND_RATE_MAX ?? 80);
    const next = Math.max(1, Math.min(max, rate));
    await getRedis().set(this.key(), JSON.stringify({ rate: next, updatedAt: Date.now() }), "EX", 3600);
    return next;
  }

  async acquire(): Promise<{ allowed: boolean; waitMs: number; rate: number }> {
    try {
      const { rate } = await this.state();
      const bucket = `${this.key()}:bucket`;
      const redis = getRedis();
      const count = await redis.incr(bucket);
      if (count === 1) await redis.pexpire(bucket, 1000);
      if (count > rate) {
        const ttl = await redis.pttl(bucket);
        return { allowed: false, waitMs: Math.max(ttl, 50), rate };
      }
      return { allowed: true, waitMs: 0, rate };
    } catch {
      // Sem Redis: permite com cautela
      return { allowed: true, waitMs: 0, rate: Number(process.env.WA_SEND_RATE_DEFAULT ?? 10) };
    }
  }

  async onSuccess() {
    try {
      const { rate } = await this.state();
      const next = Math.min(Number(process.env.WA_SEND_RATE_MAX ?? 80), rate + 0.5);
      await this.save(next);
    } catch {
      /* ignore */
    }
  }

  async onRateLimitHit() {
    try {
      const { rate } = await this.state();
      const next = Math.max(1, Math.floor(rate * 0.5));
      logInfo("wa.rate.reduced", { phoneNumberId: this.phoneNumberId, from: rate, to: next });
      await this.save(next);
    } catch {
      /* ignore */
    }
  }
}
