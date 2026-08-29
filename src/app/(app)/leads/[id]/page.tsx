import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { PIPELINE_LABEL } from "@/domain/pipeline";
import Link from "next/link";
import { maskPhone } from "@/lib/pii";
import { LeadEditor } from "@/components/lead-editor";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      campaign: true,
      owner: true,
      statusHistory: { orderBy: { createdAt: "desc" } },
      conversations: true,
      preSales: { include: { offer: true } },
      objections: true,
      consents: true,
      viabilityChecks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!lead) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-4xl" data-testid="heading-lead">
          {lead.name ?? "Lead sem nome"}
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          {lead.phone} · {lead.city ?? "cidade não informada"} · origem {lead.origin}
        </p>
        <div className="mt-2">
          <LeadBadge status={lead.status} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Atribuição</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Campanha" value={lead.campaign?.name} />
            <Field label="UTM source" value={lead.utmSource} />
            <Field label="UTM medium" value={lead.utmMedium} />
            <Field label="UTM campaign" value={lead.utmCampaign} />
            <Field label="Adset" value={lead.adset} />
            <Field label="Ad" value={lead.ad} />
            <Field label="Endereço" value={lead.address} />
            <Field label="CEP" value={lead.zipCode} />
          </CardContent>
        </Card>
        <LeadEditor lead={lead} />
        <Card>
          <CardHeader>
            <CardTitle>Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lead.conversations.map((c) => (
              <Link key={c.id} href={`/conversas/${c.id}`} className="block rounded border px-3 py-2 hover:bg-zinc-50">
                {c.channel} · {c.status}
              </Link>
            ))}
            {!lead.conversations.length && <p className="text-zinc-500">Nenhuma conversa.</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>
              <h2>Histórico de status</h2>
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            {lead.statusHistory.map((h) => (
            <div key={h.id} className="flex justify-between border-b py-1">
              <span>
                {h.fromStatus ? PIPELINE_LABEL[h.fromStatus] : "—"} → {PIPELINE_LABEL[h.toStatus]}
              </span>
              <span className="text-zinc-500">{formatDateTime(h.createdAt)}</span>
            </div>
          ))}
          {!lead.statusHistory.length && (
            <p className="text-zinc-500">Ainda não há mudanças de estágio neste lead.</p>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-zinc-400">Telefone mascarado em logs: {maskPhone(lead.phone)}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div>{value ?? "—"}</div>
    </div>
  );
}
