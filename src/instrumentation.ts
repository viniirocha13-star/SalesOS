export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startInboundWorker } = await import("@/workers/queue");
    startInboundWorker();
  }
}
