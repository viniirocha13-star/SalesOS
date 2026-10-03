import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

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
    <div className="mx-auto max-w-2xl space-y-6">
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
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">
            Pré-requisitos OK ({phones.length} número(s), {templates.length} template(s), {lists.length}{" "}
            lista(s)). O wizard completo de criação/envio entra na próxima iteração dos workers de
            campanha.
          </p>
          <Link
            href="/campaigns"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white"
          >
            Voltar às campanhas
          </Link>
        </div>
      )}
    </div>
  );
}
