import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PIPELINE_LABEL, PIPELINE_ORDER } from "@/domain/pipeline";
import { formatBRL } from "@/lib/format";
import { LeadBadge } from "@/components/status-badge";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";

export default async function DashboardPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard comercial</h1>
        <p className="text-sm text-zinc-500">Funil completo: campanha → lead → pré-venda → venda → instalação.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-zinc-500">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">{k.value}</CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Funil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PIPELINE_ORDER.filter((s) => s !== "PERDIDO").map((status) => (
            <div key={status} className="min-w-28 rounded-lg border bg-white p-3">
              <div className="text-2xl font-semibold">{funnelMap[status] ?? 0}</div>
              <div className="text-xs text-zinc-500">{PIPELINE_LABEL[status as LeadStatus]}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Leads recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between rounded-md border px-3 py-2 hover:bg-zinc-50">
              <div>
                <div className="font-medium">{lead.name ?? lead.phone}</div>
                <div className="text-xs text-zinc-500">
                  {lead.city ?? "sem cidade"} · {lead.campaign?.name ?? lead.origin}
                </div>
              </div>
              <LeadBadge status={lead.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
