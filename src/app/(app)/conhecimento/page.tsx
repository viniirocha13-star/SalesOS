import { prisma } from "@/lib/prisma";
import { KnowledgeForm } from "@/components/knowledge-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { BookExplorer } from "@/components/book-explorer";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import Link from "next/link";
import { formatBRL } from "@/lib/format";

export default async function ConhecimentoPage() {
  const session = await auth();
  const canWrite = session?.user ? can(session.user.role as Role, "knowledge.write") : false;
  const [docs, active] = await Promise.all([
    prisma.knowledgeDocument.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.offerBook.findFirst({
      where: { status: "ACTIVE" },
      include: { offers: { where: { status: "APROVADA" } }, _count: { select: { knowledge: true } } },
    }),
  ]);
  const cats = active
    ? {
        FIBRA: active.offers.filter((o) => o.categoryNormalized === "FIBRA").length,
        COMBO: active.offers.filter((o) => o.isCombo || o.categoryNormalized === "COMBO").length,
        MOVEL: active.offers.filter((o) => o.categoryNormalized === "MOVEL").length,
        FWA: active.offers.filter((o) => o.categoryNormalized === "FWA").length,
        streaming: active.offers.filter((o) => JSON.stringify(o.includedStreaming ?? []).length > 4).length,
        apps: active.offers.filter((o) => o.unlimitedApps.length).length,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Books — base comercial"
        description="O book diz o que é verdade. O Offer Engine diz o que é elegível. A IA só conversa."
      />

      <section className="surface p-5">
        <h2 className="font-heading text-2xl">Book ACTIVE</h2>
        {active ? (
          <>
            <p className="mt-1 text-sm text-slate-600">
              <Link href={`/ofertas/books/${active.id}`} className="text-teal underline">
                {active.originalName}
              </Link>{" "}
              · {active.offers.length} ofertas · {active._count.knowledge} documentos de produto
            </p>
            {cats && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(cats).map(([k, v]) => (
                  <div key={k} className="rounded-2xl bg-[#efe6d9]/70 p-3">
                    <p className="text-[10px] tracking-[0.12em] text-ink/40 uppercase">{k}</p>
                    <p className="font-heading text-2xl">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Nenhum book ativo. Importe e aprove em{" "}
            <Link href="/ofertas" className="text-teal underline">
              Ofertas
            </Link>
            .
          </p>
        )}
      </section>

      <section className="surface p-5">
        <h2 className="font-heading text-2xl">Explorar conhecimento</h2>
        <p className="mt-1 text-sm text-slate-500">Respostas só com o book vigente. Nada inventado.</p>
        <div className="mt-4">
          <BookExplorer />
        </div>
      </section>

      {active && (
        <section className="surface overflow-x-auto p-5">
          <h2 className="mb-3 font-heading text-2xl">Ofertas aprovadas</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th className="p-2">Plano</th>
                <th className="p-2">Cat.</th>
                <th className="p-2">Preço promo</th>
                <th className="p-2">Depois</th>
                <th className="p-2">Streaming</th>
              </tr>
            </thead>
            <tbody>
              {active.offers.slice(0, 40).map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="p-2">
                    <Link href={`/ofertas/${o.id}`} className="hover:underline">
                      {o.name}
                    </Link>
                  </td>
                  <td className="p-2">{o.categoryNormalized}</td>
                  <td className="p-2">{formatBRL(o.promotionalPriceCents ?? o.priceCents)}</td>
                  <td className="p-2">{formatBRL(o.futurePriceCents)}</td>
                  <td className="p-2 text-xs">{JSON.stringify(o.includedStreaming ?? [])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Regras publicadas</h2>
        {canWrite ? <KnowledgeForm /> : <p className="text-sm text-ink/50">Somente supervisor/admin publica documentos.</p>}
        {!docs.length && <p className="surface p-5 text-sm text-ink/50">Nenhum documento ainda. Sem conteúdo aprovado a IA não inventa regra.</p>}
        {docs.map((d) => (
          <div key={d.id} className="surface p-5">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-xl">{d.title}</h3>
              <Badge>{d.type}</Badge>
              <Badge variant={d.approved ? "secondary" : "destructive"}>v{d.version}</Badge>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{d.content}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
