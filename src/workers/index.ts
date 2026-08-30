import { assertProdEnv } from "@/lib/prod-env";
import { startInboundWorker } from "./queue";
import { closeQueue } from "./queue";
import { startWorkerHeartbeat } from "./heartbeat";
import { startPostSaleTicker } from "./post-sale-ticker";

if (process.env.NODE_ENV === "production") {
  assertProdEnv("worker");
}

const worker = startInboundWorker();
const heartbeat = startWorkerHeartbeat();
const postSale = startPostSaleTicker();

async function shutdown() {
  clearInterval(heartbeat);
  clearInterval(postSale);
  await worker?.close();
  await closeQueue();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
