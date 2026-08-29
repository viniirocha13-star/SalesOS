import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { createPreSale } from "@/domain/presale";
import { getLaunchSnapshot } from "@/domain/launch-ready";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    await requirePermission("operation.queue");
    const { leadId } = (await request.json()) as { leadId: string };
    if (!leadId) return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
    const snap = await getLaunchSnapshot(leadId);
    if (snap.preSaleId) return NextResponse.json({ preSaleId: snap.preSaleId, existing: true });
    if (!snap.offerId) return NextResponse.json({ error: "sem_oferta_aceita" }, { status: 400 });
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    const preSale = await createPreSale({
      leadId,
      offerId: snap.offerId,
      address: lead.address ?? undefined,
      aiSummary: "Pré-venda gerada pelo operador após a IA coletar os dados do plano.",
    });
    return NextResponse.json({ preSaleId: preSale.id });
  } catch (error) {
    return errorResponse(error);
  }
}
