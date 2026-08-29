import { Queue, Worker, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { logError, logInfo } from "@/lib/logger";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

let connection: IORedis | null = null;
let inboundQueue: Queue | null = null;
const memoryJobs = new Map<string, ReturnType<typeof setTimeout>>();

export function redisAvailable() {
  return Boolean(process.env.REDIS_URL || process.env.NODE_ENV !== "test");
}

function getConnection() {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  }
  return connection;
}

export function getInboundQueue() {
  if (!inboundQueue) {
    inboundQueue = new Queue("wa-inbound", { connection: getConnection() });
  }
  return inboundQueue;
}

export async function enqueueInbound(conversationId: string, delayMs = Number(process.env.MESSAGE_BUFFER_MS ?? 3500)) {
  const jobId = `buf-${conversationId}`;
  try {
    const queue = getInboundQueue();
    const existing = await queue.getJob(jobId);
    if (existing && (await existing.getState()) !== "completed" && (await existing.getState()) !== "failed") {
      await existing.changeDelay(delayMs);
      return;
    }
    const opts: JobsOptions = { jobId, delay: delayMs, attempts: 5, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 1000 };
    await queue.add("buffer-ready", { conversationId }, opts);
  } catch (error) {
    logError("queue.enqueue_failed", { conversationId, fallback: "memory" });
    enqueueMemory(conversationId, delayMs);
    void error;
  }
}

function enqueueMemory(conversationId: string, delayMs: number) {
  const prev = memoryJobs.get(conversationId);
  if (prev) clearTimeout(prev);
  memoryJobs.set(
    conversationId,
    setTimeout(() => {
      memoryJobs.delete(conversationId);
      import("@/workers/process-inbound")
        .then((m) => m.processBufferedConversation(conversationId))
        .catch((e) => logError("queue.memory_job_failed", { message: String(e) }));
    }, delayMs),
  );
}

export async function closeQueue() {
  if (inboundQueue) await inboundQueue.close();
  inboundQueue = null;
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}

export function startInboundWorker() {
  const g = globalThis as unknown as { __brisaWorker?: Worker };
  if (g.__brisaWorker) return g.__brisaWorker;
  try {
    const worker = new Worker(
      "wa-inbound",
      async (job) => {
        const { processBufferedConversation } = await import("@/workers/process-inbound");
        await processBufferedConversation(job.data.conversationId);
      },
      { connection: getConnection(), concurrency: 8 },
    );
    worker.on("failed", (job, err) => logError("worker.failed", { id: job?.id, message: err.message }));
    worker.on("completed", (job) => logInfo("worker.completed", { id: job.id }));
    logInfo("worker.started", { queue: "wa-inbound" });
    g.__brisaWorker = worker;
    return worker;
  } catch (error) {
    logError("worker.start_failed", { message: String(error) });
    return null;
  }
}
