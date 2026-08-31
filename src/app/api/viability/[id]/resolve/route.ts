import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { resolveBoxCheck } from "@/domain/viability";
import { audit } from "@/lib/audit";
import type { ViabilityResult } from "@prisma/client";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("operation.queue");
    const { id } = await ctx.params;
    const body = (await req.json()) as { result?: ViabilityResult };
    const created = await resolveBoxCheck(id, body.result as ViabilityResult, user.id);
    await audit({
      actorId: user.id,
      action: "viability.resolve_box",
      entity: "ViabilityCheck",
      entityId: created.id,
    });
    return NextResponse.json({ ok: true, check: created });
  } catch (error) {
    return errorResponse(error);
  }
}
