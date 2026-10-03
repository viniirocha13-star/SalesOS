import { PageHeader } from "@/components/page-header";
import { CampaignWizard } from "@/components/campaign-wizard";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function NewCampaignPage() {
  const ctx = await requireOrg("campaigns.write");
  const [phones, templates, lists] = await Promise.all([
    prisma.phoneNumber.findMany({ where: { organizationId: ctx.organization.id } }),
    prisma.messageTemplate.findMany({
      where: { organizationId: ctx.organization.id, status: "APPROVED" },
    }),
    prisma.contactList.findMany({ where: { organizationId: ctx.organization.id } }),
  ]);

  const blockers: string[] = [];
  if (!phones.length) blockers.push("Conecte um número WhatsApp");
  if (!templates.length) blockers.push("Sincronize ou aprove um template");
  if (!lists.length) blockers.push("Crie ou importe uma lista de contatos");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="Wizard · 8 etapas"
        title="Nova campanha"
        description="Nome → número → público → template → variáveis → horário → revisão → envio."
      />
      {blockers.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Antes de criar a campanha, conclua:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <Link href="/onboarding" className="mt-3 inline-block font-semibold text-[#148a52] hover:underline">
            Abrir passo a passo
          </Link>
        </div>
      ) : (
        <CampaignWizard
          phones={phones.map((p) => ({
            id: p.id,
            label: p.displayPhoneNumber,
            meta: p.verifiedName ?? undefined,
          }))}
          templates={templates.map((t) => ({
            id: t.id,
            label: t.name,
            meta: `${t.category} · ${t.language}`,
          }))}
          lists={lists.map((l) => ({ id: l.id, label: l.name, meta: l.kind }))}
        />
      )}
    </div>
  );
}
