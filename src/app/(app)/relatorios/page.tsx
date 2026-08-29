import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";

export default async function RelatoriosPage() {
  const byCity = await prisma.lead.groupBy({ by: ["city"], _count: true });
  const byOrigin = await prisma.lead.groupBy({ by: ["origin"], _count: true });
  const offers = await prisma.preSale.groupBy({ by: ["offerId"], _count: true });
  const offerNames = await prisma.offer.findMany({
    where: { id: { in: offers.map((o) => o.offerId) } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relatórios</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-medium">Leads por cidade</h2>
          {byCity.map((r) => (
            <div key={r.city ?? "x"} className="flex justify-between text-sm">
              <span>{r.city ?? "sem cidade"}</span>
              <span>{r._count}</span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-medium">Leads por canal</h2>
          {byOrigin.map((r) => (
            <div key={r.origin} className="flex justify-between text-sm">
              <span>{r.origin}</span>
              <span>{r._count}</span>
            </div>
          ))}
        </section>
        <section className="rounded-xl border bg-white p-4 md:col-span-2">
          <h2 className="mb-2 font-medium">Pré-vendas por oferta</h2>
          {offers.map((o) => (
            <div key={o.offerId} className="flex justify-between text-sm">
              <span>{offerNames.find((n) => n.id === o.offerId)?.name}</span>
              <span>{o._count} · {formatBRL(offerNames.find((n) => n.id === o.offerId)?.promotionalPriceCents)}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
