import { prisma } from "@/lib/prisma";
import { createPreSale } from "@/domain/presale";

const FIELD_LABEL: Record<string, string> = {
  FULL_NAME: "Nome completo",
  CPF: "CPF",
  ADDRESS: "Endereço",
  CITY: "Cidade",
  CEP: "CEP",
  PHONE: "Telefone",
};

export async function getLaunchSnapshot(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: {
      customer: true,
      acceptances: { orderBy: { createdAt: "desc" }, take: 1 },
      preSales: { include: { offer: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  const customer =
    lead.customer ?? (await prisma.customer.findUnique({ where: { phone: lead.phone } }));
  const defs = await prisma.requiredFieldDefinition.findMany({ where: { productType: "fibra", required: true } });
  const have: Record<string, boolean> = {
    FULL_NAME: Boolean(lead.name || customer?.fullName),
    CPF: Boolean(customer?.documentCpf || customer?.documentCpfEncrypted),
    PHONE: Boolean(lead.phone),
    CITY: Boolean(lead.city),
    ADDRESS: Boolean(lead.address),
    CEP: Boolean(lead.zipCode),
  };
  const keys = defs.length ? defs.map((d) => d.fieldKey) : ["FULL_NAME", "CPF", "ADDRESS", "CITY", "CEP"];
  const fields = keys.map((key) => ({
    key,
    label: FIELD_LABEL[key] ?? key,
    ok: Boolean(have[key]),
  }));
  const missing = fields.filter((f) => !f.ok).map((f) => f.label);
  const acceptance = lead.acceptances[0];
  const queued = lead.preSales.find((p) => ["PRONTA", "EM_LANCAMENTO", "PENDENCIA"].includes(p.status));
  const offerName = queued?.offer.name ?? null;
  const accepted = Boolean(acceptance);
  const dataComplete = missing.length === 0;

  let phase: "selling" | "collecting" | "ready" | "queued" = "selling";
  if (queued) phase = "queued";
  else if (accepted && dataComplete) phase = "ready";
  else if (accepted || lead.status === "COLETANDO_DADOS" || lead.status === "ACEITE_COMERCIAL") phase = "collecting";

  return {
    phase,
    accepted,
    dataComplete,
    fields,
    missing,
    preSaleId: queued?.id ?? null,
    offerName,
    offerId: acceptance?.offerId ?? queued?.offerId ?? null,
    leadName: lead.name,
  };
}

/** Cliente enviou os dados do plano → entra na fila. Só o operador lança no sistema. */
export async function enqueueLaunchIfCustomerReady(leadId: string) {
  const snap = await getLaunchSnapshot(leadId);
  if (snap.preSaleId) return { preSaleId: snap.preSaleId, created: false };
  if (!snap.accepted || !snap.dataComplete || !snap.offerId) return { preSaleId: null, created: false };
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const preSale = await createPreSale({
    leadId,
    offerId: snap.offerId,
    address: lead.address ?? undefined,
    aiSummary: "Cliente enviou os dados do plano. Aguardando o operador lançar no sistema.",
  });
  return { preSaleId: preSale.id, created: true };
}
