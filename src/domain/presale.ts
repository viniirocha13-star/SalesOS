import { prisma } from "@/lib/prisma";
import { emit } from "@/events/bus";
import { transitionLead } from "@/domain/leads";
import type { LaunchResult } from "@prisma/client";

export async function createPreSale(input: {
  leadId: string;
  offerId: string;
  registrationData?: object;
  address?: string;
  viabilitySummary?: string;
  consentsSnapshot?: object;
  aiSummary?: string;
  customerId?: string;
}) {
  const preSale = await prisma.preSale.create({
    data: {
      ...input,
      status: "PRONTA",
    },
    include: { offer: true, lead: true },
  });
  await transitionLead(input.leadId, "PRONTO_PARA_LANCAMENTO", "pré-venda criada");
  await emit("PRE_SALE_CREATED", preSale.id, { leadId: input.leadId, offerId: input.offerId });
  return preSale;
}

export async function applyLaunchResult(input: {
  preSaleId: string;
  actorId: string;
  result: LaunchResult;
  quoteNumber?: string;
  orderNumber?: string;
  notes?: string;
}) {
  const preSale = await prisma.preSale.update({
    where: { id: input.preSaleId },
    data: {
      launchResult: input.result,
      quoteNumber: input.quoteNumber,
      orderNumber: input.orderNumber,
      launchNotes: input.notes,
      status:
        input.result === "APROVADO"
          ? "APROVADA"
          : input.result === "PENDENCIA"
            ? "PENDENCIA"
            : "REPROVADA",
    },
    include: { lead: true, offer: true },
  });

  if (input.result === "APROVADO") {
    const sale = await prisma.sale.create({
      data: {
        preSaleId: preSale.id,
        leadId: preSale.leadId,
        campaignId: preSale.lead.campaignId,
        offerId: preSale.offerId,
        ticketCents: preSale.offer.promotionalPriceCents ?? preSale.offer.priceCents,
      },
    });
    await prisma.saleEvent.create({
      data: { saleId: sale.id, type: "SALE_REGISTERED", payload: { orderNumber: input.orderNumber } },
    });
    await transitionLead(preSale.leadId, "CADASTRO_APROVADO", input.notes, input.actorId);
    await emit("SALE_REGISTERED", sale.id, {
      leadId: preSale.leadId,
      orderNumber: input.orderNumber,
    });
  } else if (input.result === "PENDENCIA") {
    await transitionLead(preSale.leadId, "PENDENCIA", input.notes, input.actorId);
  } else {
    await transitionLead(preSale.leadId, "PERDIDO", input.notes, input.actorId);
  }

  return preSale;
}
