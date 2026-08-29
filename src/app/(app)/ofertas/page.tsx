import { prisma } from "@/lib/prisma";
import { OfferBadge } from "@/components/status-badge";
import { formatBRL, formatDateTime } from "@/lib/format";
import Link from "next/link";
import { OfferImportForm } from "@/components/offer-import-form";
import { BookRetireButton } from "@/components/book-retire-button";
import { OfferRetireButton } from "@/components/offer-retire-button";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/page-header";
import type { Role } from "@prisma/client";

export default async function OfertasPage() {
  const session = await auth();
  const role = session?.user?.role as Role | undefined;
  const canManage = role ? can(role, "offers.import") : false;
  const [offers, books] = await Promise.all([
    prisma.offer.findMany({ include: { book: true }, orderBy: { createdAt: "desc" } }),
    prisma.offerBook.findMany({ include: { _count: { select: { offers: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Catálogo"
        title="Books e ofertas"
        description="O book é o conjunto de produtos que a IA pode vender. Não é aprovação do cliente."
        titleTestId="heading-books"
      />

      <section className="surface p-5" id="upload-book">
        <h2 className="text-lg font-semibold">Enviar book para a IA</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          O arquivo vira o catálogo de trabalho. Os produtos entram na IA na hora. Um book novo soma aos
          anteriores. Excluir um book é independente — não precisa ter outro no lugar.
        </p>
        <div className="mt-4">
          {canManage ? (
            <OfferImportForm />
          ) : (
            <p className="text-sm text-slate-500">Somente operação/gestão envia ou exclui books.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Books na IA</h2>
        {!books.length && (
          <p className="surface p-5 text-sm text-slate-500">Nenhum book. Envie um arquivo acima para a IA vender esses produtos.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {books.map((b) => (
            <article key={b.id} className="surface flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-medium text-slate-900">{b.originalName}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {b._count.offers} produto{b._count.offers === 1 ? "" : "s"} · {formatDateTime(b.createdAt)}
                </p>
              </div>
              {canManage && <BookRetireButton bookId={b.id} name={b.originalName} />}
            </article>
          ))}
        </div>
      </section>

      <section className="surface overflow-x-auto">
        <h2 className="font-heading border-b border-[#efe6d9] px-4 py-3 text-xl">Produtos que a IA pode vender</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Produto</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Velocidade</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Na IA</th>
              {canManage && <th className="p-3">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">
                  <Link href={`/ofertas/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                  {o.book && <p className="text-xs text-slate-400">{o.book.originalName}</p>}
                </td>
                <td className="p-3">{o.city ?? "—"}</td>
                <td className="p-3">{o.speedMbps ? `${o.speedMbps} Mega` : "—"}</td>
                <td className="p-3">{formatBRL(o.promotionalPriceCents ?? o.priceCents)}</td>
                <td className="p-3">
                  <OfferBadge status={o.status} />
                </td>
                {canManage && (
                  <td className="p-3">
                    {o.status === "APROVADA" ? (
                      <OfferRetireButton offerId={o.id} name={o.name} />
                    ) : (
                      <span className="text-xs text-slate-400">Fora da IA</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!offers.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={canManage ? 6 : 5}>
                  Nenhum produto no catálogo. Envie um book.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
