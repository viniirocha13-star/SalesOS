import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, errorResponse } from "@/lib/session";

export async function GET(request: Request) {
  try {
    await requireUser();
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ leads: [] });
    const digits = q.replace(/\D/g, "");
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      },
      take: 8,
      select: { id: true, name: true, phone: true },
    });
    return NextResponse.json({ leads });
  } catch (error) {
    return errorResponse(error);
  }
}
