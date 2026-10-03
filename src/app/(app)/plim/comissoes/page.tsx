import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { getCommissionTotalsByMarketplace } from "@/lib/repositories/plim/analytics";
import { PlimFileImport } from "@/components/plim/plim-file-import";
import { importCommissionFile } from "@/app/(app)/plim/analytics-actions";
import { MetricCard, MetricSection } from "@/components/plim/metric-card";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PlimComissoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const data = await getCommissionTotalsByMarketplace(ctx.tenantId);
  const canImport = canPlimWrite(ctx.profile);

  const sumPeriod = (key: "today" | "yesterday" | "month") =>
    Object.values(data.byMarketplacePeriod[key] ?? {}).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Comissões</h1>
        <p className="text-sm text-slate-500">Totais por marketplace, grupo, campanha e produto (PlimCommissionEvent).</p>
      </div>

      <MetricSection title="Totais por marketplace">
        <MetricCard label="Hoje" value={money(sumPeriod("today"))} />
        <MetricCard label="Ontem" value={money(sumPeriod("yesterday"))} />
        <MetricCard label="Mês" value={money(sumPeriod("month"))} />
      </MetricSection>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Por grupo (mês)</h2>
          <ul className="space-y-1 text-sm">
            {data.byGroup.map((g) => (
              <li key={g.groupId ?? "none"} className="flex justify-between gap-2">
                <span>{g.groupName}</span>
                <span className="font-medium">{money(g.commission)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Por campanha (mês)</h2>
          <ul className="space-y-1 text-sm">
            {data.byCampaign.map((c) => (
              <li key={String(c.campaignId)} className="flex justify-between gap-2">
                <span className="truncate">{c.campaignId}</span>
                <span className="font-medium">{money(c.commission)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Por produto (mês)</h2>
          <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
            {data.byProduct.map((p) => (
              <li key={p.productName} className="flex justify-between gap-2">
                <span className="truncate">{p.productName}</span>
                <span className="font-medium">{money(p.commission)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <PlimFileImport
        accept=".csv,.xlsx,.xls"
        label="Importar relatório de comissões (CSV/XLSX)"
        disabled={!canImport}
        onImport={importCommissionFile}
        extraFields={
          <select name="marketplace" className="mt-2 rounded border px-2 py-1 text-sm" defaultValue="OUTRO">
            <option value="SHOPEE">Shopee</option>
            <option value="MERCADO_LIVRE">Mercado Livre</option>
            <option value="AMAZON">Amazon</option>
            <option value="MAGALU">Magalu</option>
            <option value="ALIEXPRESS">AliExpress</option>
            <option value="SHEIN">Shein</option>
            <option value="AWIN">Awin</option>
            <option value="OUTRO">Outro (padrão)</option>
          </select>
        }
      />
    </div>
  );
}
