import { prisma } from "@/lib/prisma";
import { badRequest } from "@/lib/api-error";

export type PlanMetric = "users" | "contacts" | "messages" | "phone_numbers" | "automations";

export async function checkPlanLimit(organizationId: string, metric: PlanMetric, adding = 1) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
  if (!sub) return; // sem plano ainda: libera (onboarding)
  const plan = sub.plan;

  if (metric === "contacts") {
    const count = await prisma.contact.count({ where: { organizationId } });
    if (count + adding > plan.maxContacts) {
      throw badRequest(
        `Limite do plano ${plan.name}: ${plan.maxContacts} contatos. Faça upgrade em Faturamento.`,
      );
    }
  }
  if (metric === "users") {
    const count = await prisma.organizationMember.count({ where: { organizationId } });
    if (count + adding > plan.maxUsers) {
      throw badRequest(`Limite do plano ${plan.name}: ${plan.maxUsers} usuários.`);
    }
  }
  if (metric === "phone_numbers") {
    const count = await prisma.phoneNumber.count({ where: { organizationId } });
    if (count + adding > plan.maxPhoneNumbers) {
      throw badRequest(`Limite do plano ${plan.name}: ${plan.maxPhoneNumbers} número(s).`);
    }
  }
  if (metric === "automations") {
    const count = await prisma.automation.count({ where: { organizationId } });
    if (count + adding > plan.maxAutomations) {
      throw badRequest(`Limite do plano ${plan.name}: ${plan.maxAutomations} automações.`);
    }
  }
  if (metric === "messages") {
    const now = new Date();
    const usage = await prisma.usageRecord.findFirst({
      where: {
        organizationId,
        metric: "messages",
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });
    const used = usage?.quantity ?? 0;
    if (used + adding > plan.maxMessagesPerMonth) {
      throw badRequest(
        `Limite mensal do plano ${plan.name}: ${plan.maxMessagesPerMonth} mensagens processadas.`,
      );
    }
  }
}

export async function incrementUsage(organizationId: string, metric: string, quantity = 1) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  await prisma.usageRecord.upsert({
    where: {
      organizationId_metric_periodStart: { organizationId, metric, periodStart },
    },
    create: { organizationId, metric, quantity, periodStart, periodEnd },
    update: { quantity: { increment: quantity } },
  });
}
