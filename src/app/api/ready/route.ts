import { NextResponse } from "next/server";
import { collectReadiness } from "@/lib/ops-status";

export async function GET() {
  const ready = await collectReadiness();
  return NextResponse.json(ready, { status: ready.ready ? 200 : 503 });
}
