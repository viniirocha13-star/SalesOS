import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { transitionLead } from "@/domain/leads";
import { audit } from "@/lib/audit";
import type { LeadStatus } from "@prisma/client";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("leads.write");
    const { id } = await ctx.params;
    const body = await request.json();
    const current = await prisma.lead.findUniqueOrThrow({ where: { id } });
    await prisma.lead.update({
      where: { id },
      data: {
        name: body.name || null,
        city: body.city || null,
        neighborhood: body.neighborhood || null,
        address: body.address || null,
        zipCode: body.zipCode || null,
        productInterest: body.productInterest || null,
      },
    });
    if (body.status && body.status !== current.status) {
      await transitionLead(id, body.status as LeadStatus, "edição manual", user.id);
    }
    await audit({ actorId: user.id, action: "lead.update", entity: "Lead", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
