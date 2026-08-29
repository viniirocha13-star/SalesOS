import { runPostSaleTick } from "@/domain/post-sale";
import { logError } from "@/lib/logger";

export function startPostSaleTicker(intervalMs = 15_000) {
  void runPostSaleTick().catch((error) => logError("post_sale.tick_failed", { message: String(error) }));
  const timer = setInterval(() => {
    void runPostSaleTick().catch((error) => logError("post_sale.tick_failed", { message: String(error) }));
  }, intervalMs);
  timer.unref?.();
  return timer;
}
