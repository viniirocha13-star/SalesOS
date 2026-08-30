import { NextResponse } from "next/server";
import { exploreBook } from "@/commercial/product-knowledge";
import { requirePermission, errorResponse } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requirePermission("knowledge.view");
    const q = new URL(request.url).searchParams.get("q") ?? "";
    if (q.trim().length < 3) return NextResponse.json({ answers: [], offers: [] });
    return NextResponse.json(await exploreBook(q));
  } catch (error) {
    return errorResponse(error);
  }
}
