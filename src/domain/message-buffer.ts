import { enqueueInbound } from "@/workers/queue";

export const MessageBufferService = {
  windowMs() {
    const n = Number(process.env.MESSAGE_BUFFER_MS ?? 4000);
    return Math.min(6000, Math.max(3000, Number.isFinite(n) ? n : 4000));
  },
  async schedule(conversationId: string) {
    await enqueueInbound(conversationId, this.windowMs());
  },
};
