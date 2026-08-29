import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";
import { transitionLead } from "@/domain/leads";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("operation.launch");
    const { id } = await ctx.params;
    const pre = await prisma.preSale.update({
      where: { id },
      data: { ownerId: user.id, status: "EM_LANCAMENTO", claimedAt: new Date() },
    });
    await transitionLead(pre.leadId, "EM_LANCAMENTO", "assumiu fila", user.id);
    await audit({ actorId: user.id, action: "presale.claim", entity: "PreSale", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
