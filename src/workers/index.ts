import { startInboundWorker } from "./queue";
import { closeQueue } from "./queue";

const worker = startInboundWorker();

async function shutdown() {
  await worker?.close();
  await closeQueue();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
