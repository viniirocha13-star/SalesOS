import { NextResponse } from "next/server";
import { applyLaunchResult } from "@/domain/presale";
import { requirePermission, errorResponse } from "@/lib/session";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { handleInboundMessage } from "@/ai/sales-agent";
import "@/events/handlers";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePermission("operation.launch");
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      result: "APROVADO" | "PENDENCIA" | "REPROVADO";
      quoteNumber?: string;
      orderNumber?: string;
      notes?: string;
    };
    const preSale = await applyLaunchResult({
      preSaleId: id,
      actorId: user.id,
      result: body.result,
      quoteNumber: body.quoteNumber,
      orderNumber: body.orderNumber,
      notes: body.notes,
    });
    await audit({
      actorId: user.id,
      action: `sale.launch.${body.result}`,
      entity: "PreSale",
      entityId: id,
    });

    const conv = await prisma.conversation.findFirst({
      where: { leadId: preSale.leadId },
      orderBy: { createdAt: "desc" },
    });
    if (conv) {
      const system =
        body.result === "APROVADO"
          ? `[SISTEMA] Cadastro aprovado. Pedido ${body.orderNumber || "sem número"}. Informe o cliente e conduza as próximas etapas cadastradas. Não invente prazo.`
          : body.result === "PENDENCIA"
            ? `[SISTEMA] Há pendência cadastrada pelo operador. Informe EXATAMENTE: ${body.notes || "pendência não detalhada"}. Não complete o texto.`
            : `[SISTEMA] Cadastro reprovado. Informe EXCLUSIVAMENTE o motivo do operador: ${body.notes || "motivo não informado"}. Não invente justificativa.`;
      await handleInboundMessage({ conversationId: conv.id, body: system });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
