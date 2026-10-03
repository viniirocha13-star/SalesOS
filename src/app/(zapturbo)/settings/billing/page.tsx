import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PricingRateForm } from "@/components/pricing-rate-form";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { ExternalHelp } from "@/components/external-help";
import { helpLinks } from "@/wa/help-links";

export default async function BillingSettingsPage() {
  const ctx = await requireOrg("billing.view");
  const [sub, usage, rates] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: ctx.organization.id },
      include: { plan: true },
    }),
    prisma.usageRecord.findFirst({
      where: { organizationId: ctx.organization.id, metric: "messages" },
      orderBy: { periodStart: "desc" },
    }),
    prisma.pricingRate.findMany({
      where: {
        OR: [{ organizationId: ctx.organization.id }, { organizationId: null }],
      },
      orderBy: [{ market: "asc" }, { category: "asc" }, { effectiveFrom: "desc" }],
      take: 20,
    }),
  ]);
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const canManage = ctx.role === "OWNER" || ctx.isSuperAdmin;

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
        <ExternalHelp
          className="mt-4"
          compact
          title="Cobrança online ainda não ativada nesta instalação"
          intro="A mudança de plano é registrada no painel; a cobrança automática depende de integrar um provedor de pagamento:"
          links={helpLinks(["stripe", "mercadoPago"])}
        />
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-[15px] font-semibold">Tarifas Meta configuradas</h2>
        <ExternalHelp
          className="mb-3"
          compact
          title="Os valores vêm da Meta, não do sistema"
          intro="A cobrança varia por mercado, categoria e volume e muda ao longo do tempo. Consulte a fonte oficial e cadastre a tarifa vigente aqui — o painel usa isso só como estimativa:"
          links={helpLinks(["pricingDocs", "pricingSite", "paymentMethod"])}
        />
        {rates.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma tarifa. Cadastre para estimar custos de campanha.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {rates.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span>
                  {r.market} · {r.category}
                  {!r.organizationId && <span className="ml-1 text-[10px] text-slate-400">global</span>}
                </span>
                <span className="tabular-nums">
                  {Number(r.rate).toLocaleString("pt-BR", { style: "currency", currency: r.currency })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canManage && <PricingRateForm />}
    </div>
  );
}
