import { prisma } from "@/lib/prisma";
import { getRedis } from "@/workers/queue";
import { openaiConfigured } from "@/lib/ai-models";
import { isWorkerHeartbeatFresh } from "@/workers/heartbeat";
import { WORKER_HEARTBEAT_KEY } from "@/lib/app-url";

export type IntegrationFlag = "CONNECTED" | "NOT_CONFIGURED";

export async function collectOpsStatus() {
  const timestamp = new Date().toISOString();
  let database: "up" | "down" = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch {
    database = "down";
  }

  let redis: "up" | "down" | "not_configured" = "not_configured";
  let worker: "ONLINE" | "OFFLINE" = "OFFLINE";
  let workerHeartbeatAt: string | null = null;
  let workerPid: number | null = null;
  let workerStartedAt: string | null = null;

  if (process.env.REDIS_URL) {
    try {
      const r = getRedis();
      const pong = await r.ping();
      redis = pong === "PONG" ? "up" : "down";
      const raw = await r.get(WORKER_HEARTBEAT_KEY);
      if (raw && isWorkerHeartbeatFresh(raw)) {
        worker = "ONLINE";
        const parsed = JSON.parse(raw) as { at: number; pid: number; startedAt: number };
        workerHeartbeatAt = new Date(parsed.at).toISOString();
        workerPid = parsed.pid;
        workerStartedAt = new Date(parsed.startedAt).toISOString();
      }
    } catch {
      redis = "down";
    }
  }

  const openai: IntegrationFlag = openaiConfigured() ? "CONNECTED" : "NOT_CONFIGURED";
  const whatsapp: IntegrationFlag =
    process.env.WHATSAPP_PROVIDER === "meta" && Boolean(process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN)
      ? "CONNECTED"
      : "NOT_CONFIGURED";

  return {
    status: "ok" as const,
    web: "up" as const,
    timestamp,
    version: process.env.npm_package_version ?? "0.1.0",
    webUptimeSeconds: Math.round(process.uptime()),
    database,
    redis,
    worker,
    workerHeartbeatAt,
    workerPid,
    workerStartedAt,
    openai,
    whatsapp,
  };
}

export async function collectOpsDiagnostics() {
  const base = await collectOpsStatus();
  let lastInboundAt: string | null = null;
  let lastJobAt: string | null = null;
  let lastJobLabel: string | null = null;
  let lastFailAt: string | null = null;

  try {
    const [lastInbound, lastJob, lastFail, lastProcessed] = await Promise.all([
      prisma.message.findFirst({
        where: { direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.aIExecution.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, purpose: true, toolName: true },
      }),
      prisma.message.findFirst({
        where: { status: "FAILED" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.whatsAppInboundEvent.findFirst({
        where: { processedAt: { not: null } },
        orderBy: { processedAt: "desc" },
        select: { processedAt: true },
      }),
    ]);
    lastInboundAt = lastInbound?.createdAt.toISOString() ?? null;
    lastFailAt = lastFail?.createdAt.toISOString() ?? null;
    const jobAt = lastJob?.createdAt ?? lastProcessed?.processedAt ?? null;
    lastJobAt = jobAt ? jobAt.toISOString() : null;
    lastJobLabel = lastJob
      ? [lastJob.purpose, lastJob.toolName].filter(Boolean).join(" · ") || "AIExecution"
      : lastProcessed
        ? "WhatsApp inbound processado"
        : null;
  } catch {
    // Banco indisponível não torna o WEB offline.
  }

  return {
    ...base,
    lastInboundAt,
    lastJobAt,
    lastJobLabel,
    lastFailAt,
    previewHint:
      "Se /api/health responde e /login abre no navegador, o Preview do Cursor pode estar falho — a aplicação está saudável.",
  };
}
