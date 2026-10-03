import { NextResponse } from "next/server";
import { collectOpsStatus } from "@/lib/ops-status";
import { collectPlimHealth } from "@/lib/plim/health";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ops = await collectOpsStatus();
  const plimHealth = await collectPlimHealth();
  let testMode = true;
  try {
    const settings = await prisma.plimWorkspaceSettings.findFirst({ select: { testMode: true } });
    testMode = settings?.testMode ?? true;
  } catch {
    // schema antigo ou banco indisponível
  }

  return NextResponse.json({
    status: ops.status,
    web: ops.web,
    timestamp: ops.timestamp,
    version: ops.version,
    webUptimeSeconds: ops.webUptimeSeconds,
    database: ops.database,
    redis: ops.redis,
    worker: ops.worker,
    openai: ops.openai,
    whatsapp: ops.whatsapp,
    plim: {
      globalStatus: plimHealth.globalStatus,
      subsystems: plimHealth.subsystems,
    },
    testMode,
  });
}
