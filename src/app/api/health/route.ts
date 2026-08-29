import { NextResponse } from "next/server";
import { collectOpsStatus } from "@/lib/ops-status";

export async function GET() {
  const ops = await collectOpsStatus();
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
  });
}
