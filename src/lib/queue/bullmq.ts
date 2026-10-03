import { Queue } from "bullmq";
import { getRedis } from "@/workers/queue";
import type { QueueJobPayload, QueueService } from "@/lib/queue/types";

const QUEUE_NAME = "plim-jobs";

export class BullMqQueueService implements QueueService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAME, { connection: getRedis() });
  }

  async enqueue(name: string, payload: QueueJobPayload, opts?: { delayMs?: number }) {
    const job = await this.queue.add(name, payload, { delay: opts?.delayMs });
    return job.id ?? `${name}-${Date.now()}`;
  }

  async processBatch(_limit: number) {
    // Etapa 1: stub — worker dedicado processará na Etapa 3
    return { processed: 0, failed: 0 };
  }

  async depth() {
    const [waiting, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getDelayedCount(),
    ]);
    return waiting + delayed;
  }
}
