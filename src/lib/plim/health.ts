import { collectOpsStatus } from "@/lib/ops-status";
import { getQueueService } from "@/lib/queue";
import { getPlimWhatsAppProvider } from "@/lib/providers/plim-whatsapp";
import { getTelegramProvider } from "@/lib/providers/telegram";
import { getInstagramProvider } from "@/lib/providers/instagram";
import { affiliateAdapters } from "@/lib/affiliates";

export type PlimSubsystemStatus = "ok" | "attention" | "offline" | "noop";

export async function collectPlimHealth() {
  const base = await collectOpsStatus();
  let queue: PlimSubsystemStatus = "offline";
  try {
    if (process.env.REDIS_URL) {
      const depth = await getQueueService().depth();
      queue = depth >= 0 ? "ok" : "attention";
    } else {
      queue = "attention";
    }
  } catch {
    queue = "offline";
  }

  let whatsapp: PlimSubsystemStatus = "noop";
  try {
    const st = await getPlimWhatsAppProvider().getStatus();
    whatsapp = st.connected ? "ok" : process.env.WHATSAPP_PROVIDER === "mock" ? "noop" : "attention";
  } catch {
    whatsapp = "attention";
  }

  const telegram = (await getTelegramProvider().getStatus()).ok ? "ok" : "noop";
  const instagram = (await getInstagramProvider().getStatus()).ok ? "ok" : "noop";
  const affiliates: PlimSubsystemStatus = affiliateAdapters.length > 0 ? "ok" : "attention";
  const tracking: PlimSubsystemStatus = "noop";

  const subsystems = {
    database: base.database === "up" ? "ok" : "offline",
    queue,
    whatsapp,
    telegram,
    instagram,
    affiliates,
    tracking,
  } satisfies Record<string, PlimSubsystemStatus>;

  const attention = Object.values(subsystems).some((s) => s === "attention" || s === "offline");
  const globalStatus = attention ? "ATENCAO" : "OPERACIONAL";

  return { globalStatus, subsystems, base };
}
