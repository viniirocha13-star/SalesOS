import { prisma } from "@/lib/prisma";
import { OfferBadge } from "@/components/status-badge";
import { formatBRL, formatDateTime } from "@/lib/format";
import Link from "next/link";
import { OfferImportForm } from "@/components/offer-import-form";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-books">
            Books e ofertas
          </h1>
          <p className="text-sm text-zinc-500">
            O arquivo original fica armazenado. Ofertas extraídas entram em revisão. Só APROVADA e vigente vai para o Offer Engine.
          </p>
        </div>
        {canImport ? <OfferImportForm /> : <p className="text-sm text-zinc-500">Somente supervisor/admin importa books.</p>}
      </div>
      <section className="overflow-x-auto rounded-xl border bg-white">
        <h2 className="border-b px-3 py-2 text-sm font-medium">Books importados</h2>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="p-3">Arquivo</th>
              <th className="p-3">Ofertas</th>
              <th className="p-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-3">{b.originalName}</td>
                <td className="p-3">{b._count.offers}</td>
                <td className="p-3">{formatDateTime(b.createdAt)}</td>
              </tr>
            ))}
            {!books.length && (
              <tr>
                <td className="p-6 text-zinc-500" colSpan={3}>
                  Nenhum book ainda. Envie um CSV de exemplo em /samples/book-ofertas-exemplo.csv
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-xl border bg-white">
        <h2 className="border-b px-3 py-2 text-sm font-medium">Ofertas</h2>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="p-3">Oferta</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Velocidade</th>
              <th className="p-3">Preço</th>
              <th className="p-3">Status</th>
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
              </tr>
            ))}
            {!offers.length && (
              <tr>
                <td className="p-6 text-zinc-500" colSpan={5}>
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
