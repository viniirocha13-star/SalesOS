import { prisma } from "@/lib/prisma";
import { waitMinutes } from "@/lib/format";
import { PreSaleBadge } from "@/components/status-badge";
import Link from "next/link";
import { ClaimButton } from "@/components/claim-button";

export default async function OperacaoPage() {
  const queue = await prisma.preSale.findMany({
    where: { status: { in: ["PRONTA", "EM_LANCAMENTO", "PENDENCIA"] } },
    include: { lead: true, offer: true, owner: true },
    orderBy: { queuedAt: "asc" },
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Operação · Fila de lançamento</h1>
        <p className="text-sm text-zinc-500">Pré-vendas para lançamento manual no sistema corporativo.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Oferta</th>
              <th className="p-3">Na fila</th>
              <th className="p-3">Status</th>
              <th className="p-3">Responsável</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.lead.name ?? "—"}</td>
                <td className="p-3">{item.lead.phone}</td>
                <td className="p-3">{item.lead.city ?? "—"}</td>
                <td className="p-3">{item.offer.name}</td>
                <td className="p-3">{waitMinutes(item.queuedAt)} min</td>
                <td className="p-3">
                  <PreSaleBadge status={item.status} />
                </td>
                <td className="p-3">{item.owner?.name ?? "—"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <ClaimButton preSaleId={item.id} />
                    <Link className="text-orange-700 hover:underline" href={`/operacao/${item.id}`}>
                      Abrir
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
