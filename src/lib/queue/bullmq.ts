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

  async processBatch(limit: number) {
    const { materializeDueSchedules, processPlimQueueBatch } = await import("@/lib/plim/queue-processor");
    await materializeDueSchedules();
    return processPlimQueueBatch(limit);
  }

  async depth() {
    const [waiting, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getDelayedCount(),
    ]);
    return waiting + delayed;
  }
}
