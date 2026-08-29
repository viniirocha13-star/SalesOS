import { prisma } from "@/lib/prisma";
import { PIPELINE_LABEL, PIPELINE_ORDER } from "@/domain/pipeline";
import { formatBRL } from "@/lib/format";
import { LeadBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ forbidden?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const canTasks = session?.user ? can(session.user.role as Role, "operation.queue") : false;
  const [leads, qualified, preSales, sales, installed, spendAgg, funnel, recent, launchQueue] = await Promise.all([
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
    prisma.preSale.count({ where: { status: { in: ["PRONTA", "PENDENCIA", "EM_LANCAMENTO"] } } }),
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
      {canTasks && (
        <Link href="/home" className="surface mb-6 block p-5 transition-transform hover:-translate-y-0.5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-teal uppercase">Tarefas</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Cliente enviou os dados — lançar no sistema</p>
          <p className="mt-1 text-sm text-slate-500">
            {launchQueue === 0
              ? "Nenhum pedido na fila agora. Clique para abrir Tarefas."
              : `${launchQueue} pedido${launchQueue === 1 ? "" : "s"} aguardando o operador.`}
          </p>
          <p className="mt-3 text-sm font-medium text-teal">Ir para Tarefas →</p>
        </Link>
      )}
      {params.forbidden && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Você não tem permissão para a tela solicitada.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="surface px-4 py-4">
            <p className="text-[11px] tracking-[0.14em] text-ink/40 uppercase">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="surface mt-6 p-5">
        <h2 className="text-lg font-semibold">Book vigente da IA</h2>
        <p className="mt-1 text-sm text-slate-500">
          O book é o catálogo de produtos da IA. Envie para somar; exclua quando aquele book não for mais trabalhar.
        </p>
        <Link href="/ofertas#upload-book" className="mt-3 inline-block text-sm font-medium text-teal underline">
          Ir para upload do book
        </Link>
      </div>
      <div className="surface mt-6 p-5">
        <h2 className="text-lg font-semibold">Funil</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PIPELINE_ORDER.filter((s) => s !== "PERDIDO").map((status) => (
            <div key={status} className="min-w-28 rounded-2xl bg-[#efe6d9]/70 px-4 py-3">
              <div className="text-3xl font-semibold">{funnelMap[status] ?? 0}</div>
              <div className="mt-1 text-[12px] text-ink/50">{PIPELINE_LABEL[status as LeadStatus]}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface mt-6 p-5">
        <h2 className="text-lg font-semibold">Leads recentes</h2>
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
