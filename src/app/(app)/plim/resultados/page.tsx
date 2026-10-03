import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext, ensurePlimSettings } from "@/lib/plim/tenant-context";
import { canPlimWrite, canPlimAdmin } from "@/lib/plim/profile";
import { getResultsMetrics } from "@/lib/repositories/plim/analytics";
import { resolvePlimPeriod, type PlimResultsPeriod } from "@/lib/plim/date-ranges";
import { resolveMetaAdsToken } from "@/lib/plim/meta-ads";
import { MetricCard, MetricSection } from "@/components/plim/metric-card";
import { MetaAdsPanel } from "@/components/plim/meta-ads-panel";
import { prisma } from "@/lib/prisma";
import { saveCampaignMap } from "@/app/(app)/plim/analytics-actions";
import Link from "next/link";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  return `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default async function PlimResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const sp = await searchParams;
  const period = (sp.period as PlimResultsPeriod) || "7d";
  const range = resolvePlimPeriod(period, sp.from, sp.to);
  const metrics = await getResultsMetrics(ctx.tenantId, range.from, range.to);
  const settings = await ensurePlimSettings(ctx.tenantId);
  const groups = await prisma.plimGroup.findMany({
    where: { tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  const metaToken = resolveMetaAdsToken(process.env.META_ADS_TOKEN, settings.metaAdsToken);
  const canMap = canPlimWrite(ctx.profile);

  const filters: { key: PlimResultsPeriod; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "yesterday", label: "Ontem" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "custom", label: "Personalizado" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Resultados</h1>
        <p className="text-sm text-slate-500">{range.label}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={`/plim/resultados?period=${f.key}`}
            className={`rounded-full px-3 py-1 text-sm ${
              period === f.key ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-800"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {period === "custom" && (
        <form className="flex flex-wrap gap-2 text-sm" method="get">
          <input type="hidden" name="period" value="custom" />
          <input type="date" name="from" defaultValue={sp.from?.slice(0, 10)} className="rounded border px-2 py-1" />
          <input type="date" name="to" defaultValue={sp.to?.slice(0, 10)} className="rounded border px-2 py-1" />
          <button type="submit" className="rounded bg-violet-600 px-3 py-1 text-white">Aplicar</button>
        </form>
      )}

      <MetricSection title="Resumo">
        <MetricCard label="Ofertas publicadas" value={metrics.summary.publishedOffers} />
        <MetricCard label="Cliques" value={metrics.summary.clicks} />
        <MetricCard label="CTR" value={pct(metrics.summary.ctr)} />
        <MetricCard label="Pedidos" value={metrics.summary.orders} />
        <MetricCard label="Comissões" value={money(metrics.summary.commissions)} />
        <MetricCard label="Investimento" value={money(metrics.summary.investment)} />
        <MetricCard label="Lucro" value={money(metrics.summary.profit)} />
        <MetricCard
          label="ROAS"
          value={metrics.summary.roas != null ? metrics.summary.roas.toFixed(2) : "—"}
          hint={metrics.summary.investment <= 0 ? "Sem investimento cadastrado" : undefined}
        />
      </MetricSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Por grupo</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1">Grupo</th>
                <th>Cliques</th>
                <th>Pedidos</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {metrics.byGroup.map((g) => (
                <tr key={g.groupId} className="border-t">
                  <td className="py-1">{g.groupName}</td>
                  <td>{g.clicks}</td>
                  <td>{g.orders}</td>
                  <td>{money(g.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Por oferta</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-1">Produto</th>
                <th>Cliques</th>
                <th>Pedidos</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {metrics.byOffer.map((o) => (
                <tr key={o.offerId} className="border-t">
                  <td className="max-w-[8rem] truncate py-1">{o.productName}</td>
                  <td>{o.clicks}</td>
                  <td>{o.orders}</td>
                  <td>{money(o.commission)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Mapas — campanha ↔ grupo ↔ link</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase">
              <tr>
                <th className="px-2 py-2">Campanha</th>
                <th className="px-2 py-2">Grupo</th>
                <th className="px-2 py-2">Link</th>
                <th className="px-2 py-2">Investimento</th>
                <th className="px-2 py-2">Entradas</th>
                <th className="px-2 py-2">Comissões</th>
                <th className="px-2 py-2">Receita líquida</th>
              </tr>
            </thead>
            <tbody>
              {metrics.campaignMaps.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-2 py-2">{m.name}</td>
                  <td className="px-2 py-2">{m.groupName}</td>
                  <td className="max-w-[8rem] truncate px-2 py-2">{m.linkUrl ?? "—"}</td>
                  <td className="px-2 py-2">{money(m.investment)}</td>
                  <td className="px-2 py-2">{m.entries}</td>
                  <td className="px-2 py-2">{money(m.commissions)}</td>
                  <td className="px-2 py-2">{money(m.netRevenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canMap && (
          <form action={saveCampaignMap} className="mt-3 grid gap-2 rounded-xl border border-dashed border-violet-200 p-3 sm:grid-cols-2">
            <input name="name" placeholder="Nome da campanha" className="rounded border px-2 py-1 text-sm" required />
            <select name="groupId" className="rounded border px-2 py-1 text-sm" defaultValue="">
              <option value="">Grupo (opcional)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input name="linkUrl" placeholder="Link de destino" className="rounded border px-2 py-1 text-sm" />
            <input name="investment" type="number" step="0.01" min="0" placeholder="Investimento (R$)" className="rounded border px-2 py-1 text-sm" required />
            <button type="submit" className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white sm:col-span-2">
              Adicionar mapa de campanha
            </button>
          </form>
        )}
      </section>

      <MetaAdsPanel
        configured={Boolean(metaToken)}
        fromEnv={Boolean(process.env.META_ADS_TOKEN?.trim())}
        canConfigure={canPlimAdmin(ctx.profile)}
      />
    </div>
  );
}
