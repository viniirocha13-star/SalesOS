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
  const offer = await prisma.offer.findFirst({ where: { id: input.offerId, status: "APROVADA" } });
  if (!offer) throw Object.assign(new Error("oferta_invalida"), { status: 400 });
  if (offer.endsAt && offer.endsAt < new Date()) throw Object.assign(new Error("oferta_expirada"), { status: 400 });
  const acceptance = await prisma.commercialAcceptance.findFirst({
    where: { leadId: input.leadId, offerId: input.offerId },
  });
  if (!acceptance) throw Object.assign(new Error("aceite_ausente"), { status: 400 });
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: input.leadId },
    include: { customer: true, viabilityChecks: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const lastViability = lead.viabilityChecks[0];
  if (lastViability?.result === "NAO_VIAVEL") {
    throw Object.assign(new Error("viabilidade_negativa"), { status: 400 });
  }
  const defs = await prisma.requiredFieldDefinition.findMany({ where: { productType: "fibra", required: true } });
  const have: Record<string, boolean> = {
    FULL_NAME: Boolean(lead.name || lead.customer?.fullName),
    CPF: Boolean(lead.customer?.documentCpf || lead.customer?.documentCpfEncrypted),
    PHONE: Boolean(lead.phone),
    CITY: Boolean(lead.city),
    ADDRESS: Boolean(lead.address),
    CEP: Boolean(lead.zipCode),
  };
  const missing = defs.map((d) => d.fieldKey).filter((k) => have[k] === false);
  if (missing.length) {
    throw Object.assign(new Error(`dados_obrigatorios_faltando:${missing.join(",")}`), { status: 400 });
  }
  const snapshot = {
    offer: { id: offer.id, name: offer.name, priceCents: offer.promotionalPriceCents ?? offer.priceCents, loyalty: offer.loyalty },
    acceptanceId: acceptance.id,
    viability: lastViability ? { result: lastViability.result, source: lastViability.source } : { result: "UNKNOWN" },
  };
  const preSale = await prisma.preSale.create({
    data: {
      ...input,
      status: "PRONTA",
      consentsSnapshot: input.consentsSnapshot ?? snapshot,
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
    await emit("SALE_PENDING", preSale.id, { notes: input.notes });
  } else {
    await transitionLead(preSale.leadId, "PERDIDO", input.notes, input.actorId);
    await emit("SALE_REJECTED", preSale.id, { notes: input.notes });
  }

  const conv = await prisma.conversation.findFirst({
    where: { leadId: preSale.leadId },
    orderBy: { createdAt: "desc" },
  });
  if (conv) {
    const stage =
      input.result === "APROVADO"
        ? "REGISTERED"
        : input.result === "PENDENCIA"
          ? "OPERATOR_PENDING"
          : "LOST";
    await prisma.conversation.update({ where: { id: conv.id }, data: { salesStage: stage } });
    if (input.result === "APROVADO") {
      const { startWorkflow } = await import("@/domain/workflow");
      await startWorkflow("Pós-venda padrão", conv.id, preSale.leadId);
    }
  }

  return preSale;
}
