import { getRedis } from "@/workers/queue";
import { WORKER_HEARTBEAT_KEY, WORKER_HEARTBEAT_TTL_SEC } from "@/lib/app-url";
import { logError } from "@/lib/logger";

export type WorkerHeartbeat = {
  at: number;
  pid: number;
  startedAt: number;
};

const startedAt = Date.now();

export async function writeWorkerHeartbeat() {
  const payload: WorkerHeartbeat = { at: Date.now(), pid: process.pid, startedAt };
  try {
    await getRedis().set(WORKER_HEARTBEAT_KEY, JSON.stringify(payload), "EX", WORKER_HEARTBEAT_TTL_SEC);
  } catch (error) {
    logError("worker.heartbeat_failed", { message: String(error) });
  }
}

export function startWorkerHeartbeat(intervalMs = 5000) {
  void writeWorkerHeartbeat();
  const timer = setInterval(() => void writeWorkerHeartbeat(), intervalMs);
  timer.unref?.();
  return timer;
}

export function isWorkerHeartbeatFresh(raw: string | null, now = Date.now(), maxAgeMs = 15_000) {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as WorkerHeartbeat;
    return typeof parsed.at === "number" && now - parsed.at <= maxAgeMs;
  } catch {
    return false;
  }
}
