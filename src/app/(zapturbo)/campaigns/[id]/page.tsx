import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CampaignControls } from "@/components/campaign-controls";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { getCampaignReview } from "@/wa/campaigns";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const ctx = await requireOrg("campaigns.view");
  const { id } = await params;
  const review = await getCampaignReview(ctx.organization.id, id).catch(() => null);
  if (!review) notFound();
  const { campaign, stats, estimate } = review;

  const recipients = await prisma.waCampaignRecipient.findMany({
    where: { campaignId: campaign.id, organizationId: ctx.organization.id },
    include: { contact: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        kicker="Campanha"
        title={campaign.name}
        description={`${campaign.status} · ${campaign.template.name} · ${campaign.phoneNumber.displayPhoneNumber}`}
        action={<CampaignControls campaignId={campaign.id} status={campaign.status} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Enviadas", campaign.sentCount],
          ["Entregues", campaign.deliveredCount],
          ["Lidas", campaign.readCount],
          ["Falhas", campaign.failedCount],
          ["Respostas", campaign.repliedCount],
          ["Pulados", campaign.skippedCount],
          ["Fila", campaign.queuedCount],
          ["Válidos (revisão)", stats.valid],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[12px] text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value as number}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <p>
          Opt-outs: <strong>{stats.optedOut}</strong> · Sem consentimento:{" "}
          <strong>{stats.withoutConsent}</strong>
        </p>
        <p className="mt-1 text-slate-500">
          Custo estimado:{" "}
          {estimate.found && estimate.estimatedCost != null
            ? estimate.estimatedCost.toLocaleString("pt-BR", {
                style: "currency",
                currency: estimate.currency,
              })
            : "tarifa não configurada"}
          . {estimate.note}
        </p>
        {campaign.lastError && <p className="mt-2 text-red-600">{campaign.lastError}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold">Destinatários (últimos 50)</h2>
          <Link href="/campaigns" className="text-sm text-[#148a52] hover:underline">
            Voltar
          </Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase">
            <tr>
              <th className="px-5 py-2">Contato</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Tentativas</th>
              <th className="px-5 py-2">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-5 py-2">
                  <div className="font-medium">{r.contact.name ?? "—"}</div>
                  <div className="text-slate-400">{r.contact.phoneE164}</div>
                </td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 tabular-nums">{r.attempts}</td>
                <td className="px-5 py-2 text-slate-500">
                  {r.failureMessage ?? r.skipReason ?? r.providerMessageId ?? "—"}
                </td>
              </tr>
            ))}
            {!recipients.length && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                  Nenhum destinatário ainda. Inicie a campanha para montar a fila.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
