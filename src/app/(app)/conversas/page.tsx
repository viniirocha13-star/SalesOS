import { prisma } from "@/lib/prisma";
import { createLead } from "@/domain/leads";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

async function startSimulator() {
  "use server";
  const session = await auth();
  if (!session?.user) return;
  const phone = `8599${Math.floor(10000000 + Math.random() * 89999999)}`;
  const lead = await createLead({
    name: "Lead simulador",
    phone,
    origin: "OUTROS",
    source: "simulator",
  });
  const conv = await prisma.conversation.create({
    data: { leadId: lead.id, channel: "SIMULATOR", status: "IA_ATIVA" },
  });
  redirect(`/conversas/${conv.id}`);
}

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
          <p className="text-sm text-zinc-500">Simulador da Fase 1. WhatsApp Cloud API entra na Fase 2 com o mesmo provider.</p>
        </div>
        <form action={startSimulator}>
          <Button className="bg-orange-500 hover:bg-orange-600">Nova conversa simulada</Button>
        </form>
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
