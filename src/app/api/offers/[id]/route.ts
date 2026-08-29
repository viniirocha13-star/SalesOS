import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("offers.approve");
    const { id } = await ctx.params;
    const body = await request.json();
    const offer = await prisma.offer.update({
      where: { id },
      data: {
        name: body.name,
        city: body.city || null,
        speedMbps: body.speedMbps ? Number(body.speedMbps) : null,
        priceCents: body.priceCents ? Number(body.priceCents) : null,
        promotionalPriceCents: body.promotionalPriceCents ? Number(body.promotionalPriceCents) : null,
        benefits: String(body.benefits ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        rules: body.rules,
        restrictions: body.restrictions,
        status: body.status,
      },
    });
    await audit({ actorId: user.id, action: `offer.${body.status}`, entity: "Offer", entityId: id });
    return NextResponse.json(offer);
  } catch (error) {
    return errorResponse(error);
  }
}
