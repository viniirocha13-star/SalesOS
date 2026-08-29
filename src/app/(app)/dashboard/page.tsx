import { prisma } from "@/lib/prisma";
import { PIPELINE_LABEL, PIPELINE_ORDER } from "@/domain/pipeline";
import { formatBRL } from "@/lib/format";
import { LeadBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string }>;
}) {
  const params = await searchParams;
  const [leads, qualified, preSales, sales, installed, spendAgg, funnel, recent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({
      where: { status: { notIn: ["NOVO", "PERDIDO"] } },
    }),
    prisma.preSale.count(),
    prisma.sale.count(),
    prisma.sale.count({ where: { installedAt: { not: null } } }),
    prisma.campaign.aggregate({ _sum: { spendCents: true } }),
    prisma.lead.groupBy({ by: ["status"], _count: true }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { campaign: true } }),
  ]);

  const spend = spendAgg._sum.spendCents ?? 0;
  const propostas = await prisma.lead.count({ where: { status: { in: ["OFERTA_APRESENTADA", "NEGOCIANDO"] } } });
  const cpl = leads ? spend / leads : 0;
  const cpa = sales ? spend / sales : 0;
  const cac = installed ? spend / installed : 0;
  const conversion = leads ? sales / leads : 0;
  const ticket = await prisma.sale.aggregate({ _avg: { ticketCents: true } });

  const funnelMap = Object.fromEntries(funnel.map((f) => [f.status, f._count]));

  const kpis = [
    { label: "Investimento", value: formatBRL(spend) },
    { label: "Leads", value: String(leads) },
    { label: "Qualificados", value: String(qualified) },
    { label: "Propostas", value: String(propostas) },
    { label: "Pré-vendas", value: String(preSales) },
    { label: "Vendas", value: String(sales) },
    { label: "Instalações", value: String(installed) },
    { label: "CPL", value: formatBRL(Math.round(cpl)) },
    { label: "CPA", value: sales ? formatBRL(Math.round(cpa)) : "—" },
    { label: "CAC", value: installed ? formatBRL(Math.round(cac)) : "—" },
    { label: "Conversão", value: `${(conversion * 100).toFixed(1)}%` },
    { label: "Ticket médio", value: formatBRL(ticket._avg.ticketCents) },
  ];

  return (
    <div>
      <PageHeader
        kicker="Visão do dia"
        title="Dashboard comercial"
        description="Do primeiro contato à instalação — sem planilha no meio."
        titleTestId="heading-dashboard"
      />
      {params.forbidden && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Você não tem permissão para a tela solicitada.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="surface px-4 py-4">
            <p className="text-[11px] tracking-[0.14em] text-ink/40 uppercase">{k.label}</p>
            <p className="font-heading mt-2 text-2xl text-ink">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="surface mt-6 p-5">
        <h2 className="font-heading text-2xl">Funil</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PIPELINE_ORDER.filter((s) => s !== "PERDIDO").map((status) => (
            <div key={status} className="min-w-28 rounded-2xl bg-[#efe6d9]/70 px-4 py-3">
              <div className="font-heading text-3xl">{funnelMap[status] ?? 0}</div>
              <div className="mt-1 text-[12px] text-ink/50">{PIPELINE_LABEL[status as LeadStatus]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface mt-6 p-5">
        <h2 className="font-heading text-2xl">Leads recentes</h2>
        <div className="mt-4 space-y-2">
          {!recent.length && <p className="text-sm text-ink/50">Ainda não há leads neste período.</p>}
          {recent.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between rounded-2xl px-3 py-3 hover:bg-[#efe6d9]/80"
            >
              <div>
                <div className="text-[15px]">{lead.name ?? lead.phone}</div>
                <div className="text-[13px] text-ink/45">
                  {lead.city ?? "sem cidade"} · {lead.campaign?.name ?? lead.origin}
                </div>
              </div>
              <LeadBadge status={lead.status} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
