import { Queue, Worker, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { logError, logInfo } from "@/lib/logger";
import { JOB, type JobName } from "@/workers/jobs";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

let connection: IORedis | null = null;
let inboundQueue: Queue | null = null;
const memoryJobs = new Map<string, ReturnType<typeof setTimeout>>();

export function getRedis() {
  if (!connection) {
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  }
  return connection;
}

export function getInboundQueue() {
  if (!inboundQueue) {
    inboundQueue = new Queue("wa-inbound", { connection: getRedis() });
  }
  return inboundQueue;
}

const defaultOpts: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export async function enqueueJob(name: JobName, data: Record<string, string>, opts: JobsOptions = {}) {
  const queue = getInboundQueue();
  await queue.add(name, data, { ...defaultOpts, ...opts });
}

export async function enqueueInbound(conversationId: string, delayMs = Number(process.env.MESSAGE_BUFFER_MS ?? 4000)) {
  const jobId = `ai-${conversationId}`;
  try {
    const queue = getInboundQueue();
    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state !== "completed" && state !== "failed") {
        await existing.changeDelay(delayMs);
        return;
      }
    }
    await enqueueJob(JOB.GENERATE_AI_RESPONSE, { conversationId }, { jobId, delay: delayMs });
  } catch (error) {
    logError("queue.enqueue_failed", { conversationId, fallback: "memory" });
    enqueueMemory(conversationId, delayMs);
    void error;
  }
}

export async function enqueueProcessInbound(providerEventId: string) {
  try {
    await enqueueJob(JOB.PROCESS_INBOUND_WHATSAPP_MESSAGE, { providerEventId }, { jobId: `in-${providerEventId}` });
  } catch (error) {
    logError("queue.process_enqueue_failed", { providerEventId });
    void error;
    const { processWhatsAppEvent } = await import("@/workers/process-inbound");
    await processWhatsAppEvent(providerEventId);
  }
}

export async function enqueueSendWhatsApp(messageId: string) {
  try {
    await enqueueJob(JOB.SEND_WHATSAPP_MESSAGE, { messageId }, { jobId: `out-${messageId}` });
  } catch (error) {
    logError("queue.send_enqueue_failed", { messageId });
    void error;
    const { sendWhatsAppMessage } = await import("@/workers/send-whatsapp");
    await sendWhatsAppMessage(messageId);
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
        if (job.name === JOB.PROCESS_INBOUND_WHATSAPP_MESSAGE) {
          const { processWhatsAppEvent } = await import("@/workers/process-inbound");
          await processWhatsAppEvent(job.data.providerEventId);
          return;
        }
        if (job.name === JOB.SEND_WHATSAPP_MESSAGE) {
          const { sendWhatsAppMessage } = await import("@/workers/send-whatsapp");
          await sendWhatsAppMessage(job.data.messageId);
          return;
        }
        const { processBufferedConversation } = await import("@/workers/process-inbound");
        await processBufferedConversation(job.data.conversationId);
      },
      { connection: getRedis(), concurrency: 8 },
    );
    worker.on("failed", (job, err) => {
      const attempts = job?.opts.attempts ?? 5;
      const isDead = (job?.attemptsMade ?? 0) >= attempts;
      logError(isDead ? "worker.dead_letter" : "worker.failed", {
        id: job?.id,
        jobName: job?.name,
        message: err.message,
      });
    });
    worker.on("completed", (job) => logInfo("worker.completed", { id: job.id, jobName: job.name }));
    logInfo("worker.started", { queue: "wa-inbound" });
    g.__brisaWorker = worker;
    return worker;
  } catch (error) {
    logError("worker.start_failed", { message: String(error) });
    return null;
  }
}
