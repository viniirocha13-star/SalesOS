import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CreateListForm } from "@/components/create-list-form";
import { requireOrg } from "@/lib/org";
import { prisma } from "@/lib/prisma";
import { resolveListContactIds } from "@/wa/segments";

export default async function ListsPage() {
  const ctx = await requireOrg("lists.view");
  const lists = await prisma.contactList.findMany({
    where: { organizationId: ctx.organization.id },
    include: { _count: { select: { members: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const counts = await Promise.all(
    lists.map(async (l) => {
      if (l.kind === "STATIC") return l._count.members;
      const ids = await resolveListContactIds(ctx.organization.id, l);
      return ids.length;
    }),
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <PageHeader
          kicker="ZapTurbo"
          title="Listas e segmentos"
          description="Listas estáticas ou segmentos dinâmicos (tag, origem, última interação, opt-out)."
          action={
            <Link href="/contacts/import" className="text-sm font-medium text-[#148a52] hover:underline">
              Importar contatos
            </Link>
          }
        />
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {lists.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">Nenhuma lista ainda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lists.map((l, i) => (
                <li key={l.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                  <div>
                    <p className="font-medium">{l.name}</p>
                    <p className="text-slate-400">
                      {l.kind === "DYNAMIC" ? "Segmento dinâmico" : "Lista estática"} · {counts[i]} contatos
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <CreateListForm />
    </div>
  );
}
