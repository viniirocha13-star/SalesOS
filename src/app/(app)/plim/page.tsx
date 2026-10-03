import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { getPlimDashboardMetrics } from "@/lib/repositories/plim/dashboard";
import { MetricCard, MetricSection } from "@/components/plim/metric-card";
import { CommissionsChart, ClicksChart, PublishedByChannelChart } from "@/components/plim/dashboard-charts";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PlimDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const m = await getPlimDashboardMetrics(ctx.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Visão Geral</h1>
        <p className="text-sm text-slate-500">Métricas em tempo real do workspace PLIM (dados DEMO inclusos).</p>
      </div>

      <MetricSection title="Ofertas">
        <MetricCard label="Capturadas hoje" value={m.offers.capturedToday} />
        <MetricCard label="Publicadas hoje" value={m.offers.publishedToday} />
        <MetricCard label="Aguardando" value={m.offers.waiting} />
        <MetricCard label="Rejeitadas" value={m.offers.rejected} />
      </MetricSection>

      <MetricSection title="Canais">
        <MetricCard label="WhatsApp" value={m.channels.whatsapp} hint="conexões ativas" />
        <MetricCard label="Telegram" value={m.channels.telegram} />
        <MetricCard label="Instagram" value={m.channels.instagram} />
        <MetricCard label="Grupos ativos" value={m.channels.activeGroups} />
      </MetricSection>

      <MetricSection title="Desempenho">
        <MetricCard label="Cliques hoje" value={m.performance.clicksToday} />
        <MetricCard label="7 dias" value={m.performance.clicksWeek} />
        <MetricCard label="Mês" value={m.performance.clicksMonth} />
        <MetricCard label="CTR" value="—" hint="Etapa 6" />
      </MetricSection>

      <MetricSection title="Comissões">
        <MetricCard label="Hoje" value={money(m.commissions.today)} />
        <MetricCard label="Ontem" value={money(m.commissions.yesterday)} />
        <MetricCard label="7 dias" value={money(m.commissions.week)} />
        <MetricCard label="Mês" value={money(m.commissions.month)} />
      </MetricSection>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(m.commissions.byMarketplace).map(([mp, total]) => (
          <MetricCard key={mp} label={mp.replace(/_/g, " ")} value={money(total ?? 0)} />
        ))}
      </div>

      <MetricSection title="Automações">
        <MetricCard label="Rotas ativas" value={m.automations.activeRoutes} />
        <MetricCard label="Pilotos ativos" value={m.automations.activeAutopilots} />
        <MetricCard label="Agendamentos" value={m.automations.schedules} hint="Etapa 3" />
        <MetricCard label="Fila" value={m.automations.queueItems} />
        <MetricCard label="Falhas" value={m.automations.failures} />
      </MetricSection>

      <div className="grid gap-4 lg:grid-cols-3">
        <CommissionsChart data={m.charts.commissionsByDay} />
        <ClicksChart data={m.charts.clicksByDay} />
        <PublishedByChannelChart data={m.charts.publishedByChannel} />
      </div>
    </div>
  );
}
