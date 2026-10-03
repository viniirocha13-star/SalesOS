import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function SchedulesPage() {
  const ctx = await requireOrg("campaigns.view");
  const scheduled = await prisma.waCampaign.findMany({
    where: { organizationId: ctx.organization.id, status: "SCHEDULED" },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        kicker="ZapTurbo"
        title="Agendamentos"
        description="Campanhas programadas para disparo automático pelo worker."
        action={
          <Link
            href="/campaigns/new"
            className="inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white"
          >
            Agendar campanha
          </Link>
        }
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {scheduled.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Nenhuma campanha agendada.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {scheduled.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={`/campaigns/${c.id}`} className="font-medium hover:text-[#148a52]">
                  {c.name}
                </Link>
                <p className="text-sm text-slate-500">
                  {c.scheduledAt
                    ? c.scheduledAt.toLocaleString("pt-BR")
                    : "Horário não definido"}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Agendada
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
