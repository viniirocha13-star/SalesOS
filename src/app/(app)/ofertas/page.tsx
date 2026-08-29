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
  const canImport = session?.user ? can(session.user.role as Role, "offers.import") : false;
  const [offers, books] = await Promise.all([
    prisma.offer.findMany({ include: { book: true }, orderBy: { createdAt: "desc" } }),
    prisma.offerBook.findMany({ include: { _count: { select: { offers: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Catálogo"
        title="Books e ofertas"
        description="Novos books somam planos aos que já estão aprovados. Excluir um book ou um plano é independente — não precisa ter um arquivo novo no lugar."
        titleTestId="heading-books"
      />

      <section className="surface p-5" id="upload-book">
        <h2 className="text-lg font-semibold">Atualizar a IA com o book vigente</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Envie CSV, XLSX ou PDF. Os planos novos entram como rascunho e, depois de aprovados, <strong>juntam-se</strong> aos
          vigentes. Não é obrigatório excluir o book antigo. Use Excluir só quando quiser tirar aquele arquivo (e os
          planos dele) da IA.
        </p>
        <div className="mt-4">
          {canImport ? (
            <OfferImportForm />
          ) : (
            <p className="text-sm text-slate-500">
              Seu perfil só consulta o catálogo. Peça a um supervisor ou admin para enviar o book em{" "}
              <Link className="text-teal underline" href="/ofertas#upload-book">
                Ofertas → Atualizar book vigente
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      <section className="surface overflow-x-auto">
        <h2 className="font-heading border-b border-[#efe6d9] px-4 py-3 text-xl">Books importados</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Arquivo</th>
              <th className="p-3">Ofertas</th>
              <th className="p-3">Quando</th>
              {canImport && <th className="p-3">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.originalName}</td>
                <td className="p-3">{b._count.offers}</td>
                <td className="p-3">{formatDateTime(b.createdAt)}</td>
                {canImport && (
                  <td className="p-3">
                    <BookRetireButton bookId={b.id} name={b.originalName} />
                  </td>
                )}
              </tr>
            ))}
            {!books.length && (
              <tr>
                <td className="p-6 text-zinc-500" colSpan={canImport ? 4 : 3}>
                  Nenhum book ainda. Envie um CSV de exemplo em /samples/book-ofertas-exemplo.csv
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <section className="surface overflow-x-auto">
        <h2 className="font-heading border-b border-[#efe6d9] px-4 py-3 text-xl">Ofertas</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th className="p-3">Oferta</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Velocidade</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Status</th>
              {canImport && <th className="p-3">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="p-3">
                  <Link href={`/ofertas/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                </td>
                <td className="p-3">{o.city ?? "—"}</td>
                <td className="p-3">{o.speedMbps ? `${o.speedMbps} Mega` : "—"}</td>
                <td className="p-3">{formatBRL(o.promotionalPriceCents ?? o.priceCents)}</td>
                <td className="p-3">
                  <OfferBadge status={o.status} />
                </td>
                {canImport && (
                  <td className="p-3">
                    {o.status !== "EXPIRADA" && o.status !== "REJEITADA" ? (
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
                <td className="p-6 text-ink/50" colSpan={canImport ? 6 : 5}>
                  Nenhuma oferta extraída. Importe um book para revisar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
