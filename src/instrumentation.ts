export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.START_WORKER_IN_NEXT !== "1") return;
  const { startInboundWorker } = await import("@/workers/queue");
  startInboundWorker();
}
