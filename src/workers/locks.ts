import { getRedis } from "@/workers/queue";
import { logError } from "@/lib/logger";

export async function withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T | "locked"> {
  const key = `lock:conversation:${conversationId}`;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const redis = getRedis();
    const ok = await redis.set(key, token, "EX", 45, "NX");
    if (ok !== "OK") return "locked";
    try {
      return await fn();
    } finally {
      const current = await redis.get(key);
      if (current === token) await redis.del(key);
    }
  } catch (error) {
    logError("lock.fallback_unlocked", { conversationId, message: String(error) });
    return fn();
  }
}
