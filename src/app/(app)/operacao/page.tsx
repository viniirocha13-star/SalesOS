import { prisma } from "@/lib/prisma";
import { waitMinutes } from "@/lib/format";
import { PreSaleBadge } from "@/components/status-badge";
import Link from "next/link";
import { ClaimButton } from "@/components/claim-button";
import { PageHeader } from "@/components/page-header";

export default async function OperacaoPage() {
  const queue = await prisma.preSale.findMany({
    where: { status: { in: ["PRONTA", "EM_LANCAMENTO", "PENDENCIA"] } },
    include: { lead: true, offer: true, owner: true },
    orderBy: { queuedAt: "asc" },
  });
  return (
    <div>
      <PageHeader
        kicker="Fila"
        title="Operação · Fila de lançamento"
        description="O cliente já enviou os dados. O operador lança o pedido no sistema."
      />
      <div className="surface overflow-x-auto">
        <table className="data-table">
          <thead>
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
            {!queue.length && (
              <tr>
                <td className="p-6 text-ink/50" colSpan={8}>
                  Fila vazia. Pré-vendas do simulador ou do WhatsApp aparecem aqui.
                </td>
              </tr>
            )}
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
                    <Link className="text-terracotta hover:underline" href={`/operacao/${item.id}`}>
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
