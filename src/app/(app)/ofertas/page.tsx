import { prisma } from "@/lib/prisma";
import { OfferBadge } from "@/components/status-badge";
import { formatBRL } from "@/lib/format";
import Link from "next/link";
import { OfferImportForm } from "@/components/offer-import-form";

export default async function OfertasPage() {
  const offers = await prisma.offer.findMany({ include: { book: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Administração · Ofertas</h1>
          <p className="text-sm text-zinc-500">
            Importar Book (PDF, XLSX, CSV). A IA detecta; nada é publicado sem aprovação. Somente APROVADA + vigente entra no SalesAgent.
          </p>
        </div>
        <OfferImportForm />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
