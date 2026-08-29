import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { collectOpsDiagnostics } from "@/lib/ops-status";

export async function GET() {
  try {
    await requirePermission("admin.audit");
    return NextResponse.json(await collectOpsDiagnostics());
  } catch (error) {
    return errorResponse(error);
  }
}
