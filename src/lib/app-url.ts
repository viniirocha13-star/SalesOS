const DEFAULT_PORT = 43147;

export function appPort(): number {
  const raw = process.env.PORT ?? process.env.APP_PORT;
  const n = raw ? Number(raw) : DEFAULT_PORT;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

export function appOrigin(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `http://127.0.0.1:${appPort()}`;
}

export function loginUrl(): string {
  return `${appOrigin()}/login`;
}

export function healthUrl(): string {
  return `${appOrigin()}/api/health`;
}

export const WORKER_HEARTBEAT_KEY = "ops:worker:heartbeat";
export const WORKER_HEARTBEAT_TTL_SEC = 20;
