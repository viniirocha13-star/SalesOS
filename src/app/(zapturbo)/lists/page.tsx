import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";

export default async function ListsPage() {
  const ctx = await requireOrg("lists.view");
  const lists = await prisma.contactList.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { members: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        kicker="ZapTurbo"
        title="Listas e segmentos"
        description="Listas estáticas ou segmentos dinâmicos para campanhas."
        action={
          <Link href="/contacts/import" className="inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white">
            Importar para lista
          </Link>
        }
      />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {lists.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Nenhuma lista ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lists.map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-slate-400">
                    {l.kind === "DYNAMIC" ? "Segmento dinâmico" : "Lista estática"} · {l._count.members} membros
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
