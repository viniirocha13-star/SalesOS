import { NextResponse } from "next/server";
import { getQueueService } from "@/lib/queue";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret");
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "25");
  const result = await getQueueService().processBatch(limit);
  return NextResponse.json({ ok: true, ...result });
}
