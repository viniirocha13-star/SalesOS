import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatPanel } from "@/components/chat-panel";
import { LeadBadge } from "@/components/status-badge";
import { ReturnToAiButton, HandoffButton } from "@/components/handoff-buttons";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: { lead: true, messages: { orderBy: { createdAt: "asc" } }, handoffs: true },
  });
  if (!conv) notFound();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChatPanel
          conversationId={conv.id}
          initialMessages={conv.messages}
          providerHint={process.env.OPENAI_API_KEY ? "openai" : "dev_mock_llm"}
          handoff={conv.status === "HANDOFF_HUMANO"}
        />
      </div>
      <div className="space-y-3 rounded-xl border bg-white p-4 text-sm">
        <h2 className="font-semibold">{conv.lead.name ?? conv.lead.phone}</h2>
        <LeadBadge status={conv.lead.status} />
        <p>Cidade: {conv.lead.city ?? "—"}</p>
        <p>Origem: {conv.lead.origin}</p>
        <p>Canal: {conv.channel}</p>
        <div className="flex flex-col gap-2 pt-2">
          <HandoffButton conversationId={conv.id} />
          <ReturnToAiButton conversationId={conv.id} />
        </div>
      </div>
    </div>
  );
}
