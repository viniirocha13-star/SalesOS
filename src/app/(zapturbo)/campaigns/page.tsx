import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

const STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  QUEUING: "Enfileirando",
  RUNNING: "Em andamento",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  FAILED: "Falhou",
};

export default async function CampaignsPage() {
  const ctx = await requireOrg("campaigns.view");
  const campaigns = await prisma.waCampaign.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { createdAt: "desc" },
    include: { template: true, phoneNumber: true },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        kicker="ZapTurbo"
        title="Campanhas"
        description="Envie templates aprovados para listas autorizadas. A fila e os status da Meta ficam neste painel."
        action={
          <Link
            href="/campaigns/new"
            className="inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c]"
          >
            + Nova campanha
          </Link>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] tracking-wide text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-3">Campanha</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Template</th>
              <th className="px-3 py-3">Enviadas</th>
              <th className="px-3 py-3">Entregues</th>
              <th className="px-3 py-3">Falhas</th>
              <th className="px-5 py-3">Criada</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  Nenhuma campanha. Conclua o{" "}
                  <Link href="/onboarding" className="text-[#148a52] hover:underline">
                    passo a passo
                  </Link>{" "}
                  e crie a primeira.
                </td>
              </tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-5 py-3">
                  <Link href={`/campaigns/${c.id}`} className="font-medium hover:text-[#148a52]">
                    {c.name}
                  </Link>
                </td>
                <td className="px-3 py-3">{STATUS[c.status] ?? c.status}</td>
                <td className="px-3 py-3 text-slate-500">{c.template.name}</td>
                <td className="px-3 py-3 tabular-nums">{c.sentCount}</td>
                <td className="px-3 py-3 tabular-nums">{c.deliveredCount}</td>
                <td className="px-3 py-3 tabular-nums">{c.failedCount}</td>
                <td className="px-5 py-3 text-slate-500">{c.createdAt.toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
