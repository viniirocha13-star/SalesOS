export type QueueJobPayload = Record<string, unknown>;

export interface QueueService {
  enqueue(name: string, payload: QueueJobPayload, opts?: { delayMs?: number }): Promise<string>;
  processBatch(limit: number): Promise<{ processed: number; failed: number }>;
  depth(): Promise<number>;
}
