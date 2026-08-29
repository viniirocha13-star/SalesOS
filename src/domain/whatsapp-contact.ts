import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { emit } from "@/events/bus";

export async function findOrCreateWhatsAppContact(rawPhone: string) {
  const phone = normalizePhone(rawPhone);
  const digits = phone.replace(/\D/g, "");
  const local = digits.slice(-11);
  const customer = await prisma.customer.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  let lead = await prisma.lead.findFirst({
    where: {
      OR: [{ phone }, { phone: digits }, { phone: local }, { phone: `+${digits}` }, { customerId: customer.id }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!lead) {
    const tenant = await prisma.tenant.findFirst({ where: { slug: "default" } });
    lead = await prisma.lead.create({
      data: {
        phone,
        source: "WHATSAPP",
        origin: "OUTROS",
        status: "NOVO",
        customerId: customer.id,
        tenantId: tenant?.id,
      },
    });
    await prisma.leadStatusHistory.create({ data: { leadId: lead.id, toStatus: "NOVO", reason: "whatsapp inbound" } });
    await emit("LEAD_CREATED", lead.id, { source: "WHATSAPP" });
  } else if (!lead.customerId) {
    lead = await prisma.lead.update({ where: { id: lead.id }, data: { customerId: customer.id, phone } });
  }

  let conversation = await prisma.conversation.findFirst({
    where: { leadId: lead.id, channel: "WHATSAPP" },
    orderBy: { lastMessageAt: "desc" },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        leadId: lead.id,
        tenantId: lead.tenantId,
        channel: "WHATSAPP",
        waConversationId: phone,
        salesStage: "NEW",
        aiEnabled: true,
        status: "IA_ATIVA",
      },
    });
  }

  return { phone, customer, lead, conversation };
}
