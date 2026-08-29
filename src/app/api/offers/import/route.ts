import { NextResponse } from "next/server";
import { importOfferBook } from "@/domain/offer-import";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("offers.import");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importOfferBook({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
      importedById: user.id,
    });
    await audit({
      actorId: user.id,
      action: "offer_book.import",
      entity: "OfferBook",
      entityId: result.book.id,
      metadata: { offers: result.offers.length, fileName: file.name },
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
