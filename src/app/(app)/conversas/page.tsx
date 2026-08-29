import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StartSimulatorButton } from "@/components/start-simulator-button";

export default async function ConversasPage() {
  const conversations = await prisma.conversation.findMany({
    include: { lead: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conversas</h1>
          <p className="text-sm text-zinc-500">Laboratório: o modelo vende; o backend limita fatos. Sem roteiro de frases.</p>
        </div>
        <StartSimulatorButton />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Canal</th>
              <th className="p-3">Status</th>
              <th className="p-3">Cidade</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  <Link href={`/conversas/${c.id}`} className="font-medium hover:underline">
                    {c.lead.name ?? c.lead.phone}
                  </Link>
                </td>
                <td className="p-3">{c.channel}</td>
                <td className="p-3">{c.status}</td>
                <td className="p-3">{c.lead.city ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
