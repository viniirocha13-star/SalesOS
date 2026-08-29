import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatBRL } from "@/lib/format";

export default async function HomeOperadorPage() {
  const [queue, human, mine, ready] = await Promise.all([
    prisma.preSale.count({ where: { status: { in: ["PRONTA", "PENDENCIA"] } } }),
    prisma.conversation.count({ where: { aiEnabled: false, status: "HANDOFF_HUMANO" } }),
    prisma.conversation.count({ where: { aiEnabled: false, ownerId: { not: null } } }),
    prisma.preSale.findMany({
      where: { status: { in: ["PRONTA", "EM_LANCAMENTO", "PENDENCIA"] } },
      include: { lead: true, offer: true },
      orderBy: { queuedAt: "asc" },
      take: 12,
    }),
  ]);
  const collecting = await prisma.lead.findMany({
    where: {
      status: { in: ["ACEITE_COMERCIAL", "COLETANDO_DADOS", "PRONTO_PARA_LANCAMENTO"] },
      preSales: { none: { status: { in: ["PRONTA", "EM_LANCAMENTO", "PENDENCIA"] } } },
    },
    take: 8,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader kicker="Operação" title="Agora" description="Quando a IA fecha a negociação e pede os dados do plano, o pedido aparece aqui para lançar." />
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/operacao" className="surface block p-6 transition-transform hover:-translate-y-0.5">
          <p className="text-[12px] tracking-[0.14em] text-ink/40 uppercase">Fila de lançamento</p>
          <p className="font-heading mt-3 text-5xl">{queue}</p>
        </Link>
        <Link href="/inbox?filter=human" className="surface block p-6 transition-transform hover:-translate-y-0.5">
          <p className="text-[12px] tracking-[0.14em] text-ink/40 uppercase">Aguardando humano</p>
          <p className="font-heading mt-3 text-5xl">{human}</p>
        </Link>
        <Link href="/inbox" className="surface block p-6 transition-transform hover:-translate-y-0.5">
          <p className="text-[12px] tracking-[0.14em] text-ink/40 uppercase">Conversas assumidas</p>
          <p className="font-heading mt-3 text-5xl">{mine}</p>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Lançar pedido</h2>
        <p className="mt-1 text-sm text-slate-500">IA concluiu a venda e coletou os dados. Operador lança no sistema corporativo.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {ready.map((item) => (
            <Link key={item.id} href={`/operacao/${item.id}`} className="surface block p-5 hover:border-teal">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">Pronto para lançar</p>
              <p className="mt-2 text-lg font-medium">{item.lead.name ?? item.lead.phone}</p>
              <p className="text-sm text-slate-500">
                {item.offer.name} · {formatBRL(item.offer.promotionalPriceCents ?? item.offer.priceCents)}
              </p>
              <p className="mt-3 text-sm font-medium text-teal">Abrir lançamento →</p>
            </Link>
          ))}
          {collecting.map((lead) => (
            <Link key={lead.id} href={`/leads/${lead.id}`} className="surface block p-5">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-amber-700 uppercase">IA pedindo dados</p>
              <p className="mt-2 text-lg font-medium">{lead.name ?? lead.phone}</p>
              <p className="text-sm text-slate-500">Negociação encerrada. Acompanhe a coleta no Inbox.</p>
            </Link>
          ))}
          {!ready.length && !collecting.length && (
            <p className="surface p-5 text-sm text-slate-500">Nenhum pedido nesta etapa. Quando a IA pedir os dados do plano, o card aparece aqui.</p>
          )}
        </div>
      </section>
    </div>
  );
}
