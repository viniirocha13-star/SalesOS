import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LeadBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { PIPELINE_ORDER, PIPELINE_LABEL } from "@/domain/pipeline";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          <p className="text-sm text-zinc-500">Pipeline comercial com origem e UTM persistidos.</p>
        </div>
        <form className="flex gap-2">
          <Input name="q" placeholder="Buscar" defaultValue={q} className="w-56" />
        </form>
      </div>
      <div className="flex flex-wrap gap-1">
        <Link href="/leads" className="rounded-full border bg-white px-3 py-1 text-xs">
          Todos
        </Link>
        {PIPELINE_ORDER.map((s) => (
          <Link key={s} href={`/leads?status=${s}`} className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-zinc-50">
            {PIPELINE_LABEL[s]}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
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
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t">
                <td className="p-3">
                  <Link className="font-medium hover:underline" href={`/leads/${lead.id}`}>
                    {lead.name ?? "Sem nome"}
                  </Link>
                  <div className="text-xs text-zinc-500">{lead.phone}</div>
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
