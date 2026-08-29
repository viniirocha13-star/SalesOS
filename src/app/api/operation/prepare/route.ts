import { NextResponse } from "next/server";
import { requirePermission, errorResponse } from "@/lib/session";
import { enqueueLaunchIfCustomerReady, getLaunchSnapshot } from "@/domain/launch-ready";

export async function POST(request: Request) {
  try {
    await requirePermission("operation.queue");
    const { leadId } = (await request.json()) as { leadId: string };
    if (!leadId) return NextResponse.json({ error: "leadId obrigatório" }, { status: 400 });
    const queued = await enqueueLaunchIfCustomerReady(leadId);
    if (queued.preSaleId) return NextResponse.json({ preSaleId: queued.preSaleId, existing: !queued.created });
    const snap = await getLaunchSnapshot(leadId);
    if (!snap.offerId) return NextResponse.json({ error: "sem_oferta_aceita" }, { status: 400 });
    return NextResponse.json({ error: "dados_do_cliente_incompletos" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
