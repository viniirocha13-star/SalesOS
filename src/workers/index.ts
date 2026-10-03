import { assertProdEnv } from "@/lib/prod-env";
import { startInboundWorker } from "./queue";
import { closeQueue } from "./queue";
import { startWorkerHeartbeat } from "./heartbeat";
import { startPostSaleTicker } from "./post-sale-ticker";
import { startWaPlatformWorker, closeWaQueue, enqueueWaJob, WA_JOB } from "@/workers/wa/queue";

if (process.env.NODE_ENV === "production") {
  assertProdEnv("worker");
}

const worker = startInboundWorker();
const waWorker = startWaPlatformWorker();
const heartbeat = startWorkerHeartbeat();
const postSale = startPostSaleTicker();

// Scheduler leve: campanhas agendadas + conclusão
const campaignTick = setInterval(() => {
  void enqueueWaJob(WA_JOB.CAMPAIGN_TICK, { tick: String(Date.now()) }).catch(() => undefined);
}, 30_000);
campaignTick.unref?.();

async function shutdown() {
  clearInterval(heartbeat);
  clearInterval(postSale);
  clearInterval(campaignTick);
  await worker?.close();
  await waWorker?.close();
  await closeQueue();
  await closeWaQueue();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
