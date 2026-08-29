import { startInboundWorker } from "./queue";
import { closeQueue } from "./queue";
import { startWorkerHeartbeat } from "./heartbeat";

const worker = startInboundWorker();
const heartbeat = startWorkerHeartbeat();

async function shutdown() {
  clearInterval(heartbeat);
  await worker?.close();
  await closeQueue();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
