import { PageHeader } from "@/components/page-header";
import { AutomationForm } from "@/components/automation-form";
import { AutomationToggle } from "@/components/automation-toggle";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function AutomationsPage() {
  const ctx = await requireOrg("automations.view");
  const automations = await prisma.automation.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { runs: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <PageHeader
          kicker="ZapTurbo"
          title="Automações"
          description="Gatilho → ação. Integrações avançadas (n8n, Sheets, CRM) via ação WEBHOOK — opcional."
        />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {automations.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">Nenhuma automação.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {automations.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-slate-400">
                      {a.trigger} → {a.action} · {a._count.runs} execuções
                    </p>
                  </div>
                  <AutomationToggle id={a.id} enabled={a.enabled} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <AutomationForm />
    </div>
  );
}
