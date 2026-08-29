import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function VendasPage() {
  const sales = await prisma.sale.findMany({
    include: { preSale: { include: { lead: true, offer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Vendas</h1>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Oferta</th>
              <th className="p-3">Ticket</th>
              <th className="p-3">Pedido</th>
              <th className="p-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">
                  <Link className="hover:underline" href={`/leads/${s.preSale.leadId}`}>
                    {s.preSale.lead.name}
                  </Link>
                </td>
                <td className="p-3">{s.preSale.offer.name}</td>
                <td className="p-3">{formatBRL(s.ticketCents)}</td>
                <td className="p-3">{s.preSale.orderNumber ?? "—"}</td>
                <td className="p-3">{formatDateTime(s.createdAt)}</td>
              </tr>
            ))}
            {!sales.length && (
              <tr>
                <td className="p-6 text-zinc-500" colSpan={5}>
                  Nenhuma venda lançada. Use a fila operacional após o aceite.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
