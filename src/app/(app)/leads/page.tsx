import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LeadBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { PIPELINE_ORDER, PIPELINE_LABEL } from "@/domain/pipeline";
import { PageHeader } from "@/components/page-header";
import type { LeadStatus } from "@prisma/client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = params.status as LeadStatus | undefined;
  const q = params.q?.trim();
  const leads = await prisma.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q.replace(/\D/g, "") } },
              { city: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { campaign: true, owner: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader
        kicker="Pipeline"
        title="Leads"
        description="Origem e UTM ficam no cadastro. Sem sumir no meio do caminho."
        titleTestId="heading-leads"
        action={
          <form className="flex items-end gap-2" role="search">
            <label className="text-sm text-ink/60">
              Buscar leads
              <Input name="q" placeholder="Nome, telefone ou cidade" defaultValue={q} className="mt-1 h-11 w-56 rounded-full bg-cream" />
            </label>
            <button type="submit" className="h-11 rounded-full border border-[#e0d5c6] bg-cream px-4 text-sm hover:bg-white">
              Buscar
            </button>
          </form>
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/leads" className="rounded-full bg-espresso px-3 py-1 text-xs text-[#f6efe6]">
          Todos
        </Link>
        {PIPELINE_ORDER.map((s) => (
          <Link key={s} href={`/leads?status=${s}`} className="rounded-full bg-[#efe6d9] px-3 py-1 text-xs text-ink/70 hover:bg-[#e4d8c6]">
            {PIPELINE_LABEL[s]}
          </Link>
        ))}
      </div>
      <div className="surface overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Campanha</th>
              <th className="p-3">Status</th>
              <th className="p-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {!leads.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={6}>
                  Nenhum lead encontrado com este filtro.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td className="p-3">
                  <Link className="font-medium hover:underline" href={`/leads/${lead.id}`}>
                    {lead.name ?? "Sem nome"}
                  </Link>
                  <div className="text-xs text-ink/45">{lead.phone}</div>
                </td>
                <td className="p-3">{lead.city ?? "—"}</td>
                <td className="p-3">{lead.origin}</td>
                <td className="p-3">{lead.campaign?.name ?? "—"}</td>
                <td className="p-3">
                  <LeadBadge status={lead.status} />
                </td>
                <td className="p-3">{lead.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
