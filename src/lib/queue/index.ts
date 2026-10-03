import { BullMqQueueService } from "@/lib/queue/bullmq";
import type { QueueService } from "@/lib/queue/types";

let cached: QueueService | null = null;

export function getQueueService(): QueueService {
  if (!cached) cached = new BullMqQueueService();
  return cached;
}
