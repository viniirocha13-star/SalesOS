import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", redis: Boolean(process.env.REDIS_URL) });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
