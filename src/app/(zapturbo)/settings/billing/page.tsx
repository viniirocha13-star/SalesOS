import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function BillingSettingsPage() {
  const ctx = await requireOrg("billing.view");
  const [sub, usage] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: ctx.organization.id },
      include: { plan: true },
    }),
    prisma.usageRecord.findFirst({
      where: { organizationId: ctx.organization.id, metric: "messages" },
      orderBy: { periodStart: "desc" },
    }),
  ]);
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="ZapTurbo"
        title="Faturamento"
        description="Mensalidade do SaaS é separada dos custos de mensagem cobrados pela Meta."
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-semibold">Plano atual</h2>
        <p className="mt-1 text-2xl font-semibold text-[#148a52]">{sub?.plan.name ?? "Starter"}</p>
        <p className="mt-1 text-sm text-slate-500">
          Status: {sub?.status ?? "—"} · Uso: {(usage?.quantity ?? 0).toLocaleString("pt-BR")} /{" "}
          {(sub?.plan.maxMessagesPerMonth ?? 5000).toLocaleString("pt-BR")} msgs no período
        </p>
        <Link
          href="/settings/billing"
          className="mt-4 inline-flex h-9 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white"
        >
          Fazer upgrade
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold">{p.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {(p.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: p.currency })}
              /mês
            </p>
            <ul className="mt-3 space-y-1 text-[12px] text-slate-500">
              <li>{p.maxUsers} usuários</li>
              <li>{p.maxContacts.toLocaleString("pt-BR")} contatos</li>
              <li>{p.maxMessagesPerMonth.toLocaleString("pt-BR")} msgs/mês</li>
              <li>{p.maxPhoneNumbers} número(s)</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
