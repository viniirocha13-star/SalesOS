import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StartSimulatorButton } from "@/components/start-simulator-button";
import { PageHeader } from "@/components/page-header";

export default async function ConversasPage() {
  const conversations = await prisma.conversation.findMany({
    include: { lead: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return (
    <div>
      <PageHeader
        kicker="Laboratório"
        title="Conversas"
        description="Teste a venda até o aceite e o envio dos dados. Sem OpenAI, o mock de desenvolvimento usa as mesmas tools."
        action={<StartSimulatorButton />}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {conversations.map((c) => (
          <Link key={c.id} href={`/conversas/${c.id}`} className="surface block p-5 transition-colors hover:bg-white">
            <p className="font-heading text-2xl">{c.lead.name ?? c.lead.phone}</p>
            <p className="mt-1 text-sm text-ink/50">
              {c.channel} · {c.status.replaceAll("_", " ")} · {c.lead.city ?? "sem cidade"}
            </p>
          </Link>
        ))}
        {!conversations.length && <p className="text-sm text-ink/50">Nenhuma conversa ainda. Comece uma simulada.</p>}
      </div>
    </div>
  );
}
