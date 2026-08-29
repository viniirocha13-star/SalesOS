import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

export default async function HomeOperadorPage() {
  const [queue, human, mine] = await Promise.all([
    prisma.preSale.count({ where: { status: { in: ["PRONTA", "PENDENCIA"] } } }),
    prisma.conversation.count({ where: { aiEnabled: false, status: "HANDOFF_HUMANO" } }),
    prisma.conversation.count({ where: { aiEnabled: false } }),
  ]);
  return (
    <div>
      <PageHeader kicker="Operação" title="Agora" description="O que precisa da sua ação neste momento." />
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
        <Link href="/pos-venda" className="surface block p-6 transition-transform hover:-translate-y-0.5">
          <p className="text-[12px] tracking-[0.14em] text-ink/40 uppercase">Pós-venda</p>
          <p className="mt-3 text-sm text-ink/60">Workflows, follow-ups e avisos após o pedido aprovado.</p>
        </Link>
      </div>
    </div>
  );
}
