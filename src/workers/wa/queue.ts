import { Queue, Worker, type JobsOptions } from "bullmq";
import { getRedis } from "@/workers/queue";
import { logError, logInfo } from "@/lib/logger";

export const WA_QUEUE = "wa-platform";

export const WA_JOB = {
  CAMPAIGN_PREPARE: "campaign.prepare",
  MESSAGE_SEND: "message.send",
  MESSAGE_RETRY: "message.retry",
  WEBHOOK_PROCESS: "webhook.process",
  TEMPLATE_SYNC: "template.sync",
  META_SYNC: "meta.sync",
  CAMPAIGN_TICK: "campaign.tick",
} as const;

export type WaJobName = (typeof WA_JOB)[keyof typeof WA_JOB];

let waQueue: Queue | null = null;

export function getWaQueue() {
  if (!waQueue) {
    waQueue = new Queue(WA_QUEUE, { connection: getRedis() });
  }
  return waQueue;
}

const defaultOpts: JobsOptions = {
  attempts: 4,
  backoff: {
    type: "custom",
  },
  removeOnComplete: 2000,
  removeOnFail: 5000,
};

/** Backoff: 0 → 30s → 2min → 10min */
export function waBackoffStrategy(attemptsMade: number) {
  const delays = [0, 30_000, 120_000, 600_000];
  return delays[Math.min(attemptsMade, delays.length - 1)] ?? 600_000;
}

export async function enqueueWaJob(
  name: WaJobName,
  data: Record<string, string>,
  opts: JobsOptions = {},
) {
  try {
    const queue = getWaQueue();
    await queue.add(name, data, {
      ...defaultOpts,
      ...opts,
      backoff: { type: "custom" },
    });
  } catch (error) {
    logError("wa.queue.enqueue_failed", { name, message: String(error) });
    // Fallback inline para dev sem Redis
    if (name === WA_JOB.CAMPAIGN_PREPARE) {
      const { prepareCampaign } = await import("@/workers/wa/prepare-campaign");
      await prepareCampaign(data.campaignId);
      return;
    }
    if (name === WA_JOB.MESSAGE_SEND || name === WA_JOB.MESSAGE_RETRY) {
      const { sendCampaignMessage } = await import("@/workers/wa/send-message");
      await sendCampaignMessage(data.recipientId);
      return;
    }
    if (name === WA_JOB.WEBHOOK_PROCESS) {
      const { processWebhookEvent } = await import("@/workers/wa/process-webhook");
      await processWebhookEvent(data.eventId);
      return;
    }
    throw error;
  }
}

export function startWaPlatformWorker() {
  const g = globalThis as unknown as { __zapWaWorker?: Worker };
  if (g.__zapWaWorker) return g.__zapWaWorker;

  try {
    const concurrency = Number(process.env.WA_SEND_CONCURRENCY ?? 5);
    const worker = new Worker(
      WA_QUEUE,
      async (job) => {
        switch (job.name) {
          case WA_JOB.CAMPAIGN_PREPARE: {
            const { prepareCampaign } = await import("@/workers/wa/prepare-campaign");
            await prepareCampaign(job.data.campaignId);
            return;
          }
          case WA_JOB.MESSAGE_SEND:
          case WA_JOB.MESSAGE_RETRY: {
            const { sendCampaignMessage } = await import("@/workers/wa/send-message");
            await sendCampaignMessage(job.data.recipientId);
            return;
          }
          case WA_JOB.WEBHOOK_PROCESS: {
            const { processWebhookEvent } = await import("@/workers/wa/process-webhook");
            await processWebhookEvent(job.data.eventId);
            return;
          }
          case WA_JOB.TEMPLATE_SYNC: {
            const { syncTemplatesForOrg } = await import("@/wa/templates");
            await syncTemplatesForOrg(job.data.organizationId);
            return;
          }
          case WA_JOB.META_SYNC: {
            const { syncMetaAssets } = await import("@/wa/meta-connection");
            await syncMetaAssets(job.data.organizationId);
            return;
          }
          case WA_JOB.CAMPAIGN_TICK: {
            const { tickCampaigns } = await import("@/workers/wa/campaign-tick");
            await tickCampaigns();
            return;
          }
          default:
            logError("wa.worker.unknown_job", { name: job.name });
        }
      },
      {
        connection: getRedis(),
        concurrency,
        settings: {
          backoffStrategy: waBackoffStrategy,
        },
      },
    );

    worker.on("failed", (job, err) => {
      logError("wa.worker.failed", { id: job?.id, name: job?.name, message: err.message });
    });
    worker.on("completed", (job) => logInfo("wa.worker.completed", { id: job.id, name: job.name }));
    logInfo("wa.worker.started", { queue: WA_QUEUE, concurrency });
    g.__zapWaWorker = worker;
    return worker;
  } catch (error) {
    logError("wa.worker.start_failed", { message: String(error) });
    return null;
  }
}

export async function closeWaQueue() {
  if (waQueue) await waQueue.close();
  waQueue = null;
}
