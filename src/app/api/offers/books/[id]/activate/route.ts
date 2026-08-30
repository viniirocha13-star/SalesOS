import { NextResponse } from "next/server";
import { activateOfferBook } from "@/domain/book-activate";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("offers.approve");
    const { id } = await ctx.params;
    const book = await activateOfferBook(id);
    await audit({ actorId: user.id, action: "offer_book.activate", entity: "OfferBook", entityId: id });
    return NextResponse.json(book);
  } catch (error) {
    return errorResponse(error);
  }
}
