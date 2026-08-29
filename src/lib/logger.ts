import { maskForLog } from "@/lib/pii";

export function logInfo(event: string, data?: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", event, ...((maskForLog(data) as object) ?? {}) }));
}

export function logError(event: string, data?: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", event, ...((maskForLog(data) as object) ?? {}) }));
}
