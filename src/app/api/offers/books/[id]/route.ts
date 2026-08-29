import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";
import { retireOfferBook } from "@/domain/offer-book";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("offers.import");
    const { id } = await ctx.params;
    const result = await retireOfferBook(id);
    await audit({
      actorId: user.id,
      action: "offer_book.retire",
      entity: "OfferBook",
      entityId: id,
      metadata: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
