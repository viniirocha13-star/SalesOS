"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChatPanel } from "@/components/chat-panel";
import { LabInspector } from "@/components/lab-inspector";
import { LeadBadge } from "@/components/status-badge";
import { ReturnToAiButton, HandoffButton } from "@/components/handoff-buttons";
import type { LeadStatus } from "@prisma/client";

type Conv = {
  id: string;
  channel: string;
  status: string;
  lead: { name: string | null; phone: string; city: string | null; origin: string; status: LeadStatus };
  messages: { id: string; direction: "INBOUND" | "OUTBOUND"; body: string }[];
};

export default function ConversaPage() {
  const params = useParams<{ id: string }>();
  const [conv, setConv] = useState<Conv | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch(`/api/inbox/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.lead) {
          setConv({
            id: params.id,
            channel: json.channel ?? "SIMULATOR",
            status: json.status,
            lead: json.lead,
            messages: json.messages ?? [],
          });
        }
      });
  }, [params.id, tick]);

  if (!conv) return <p className="text-sm text-zinc-500">Carregando laboratório…</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChatPanel
          conversationId={conv.id}
          initialMessages={conv.messages}
          providerHint={process.env.NEXT_PUBLIC_LLM_HINT ?? "runtime"}
          handoff={conv.status === "HANDOFF_HUMANO"}
          onTurn={() => setTick((n) => n + 1)}
        />
      </div>
      <div className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">{conv.lead.name ?? conv.lead.phone}</h2>
        <LeadBadge status={conv.lead.status} />
        <p className="text-sm">Cidade: {conv.lead.city ?? "—"}</p>
        <p className="text-sm">Canal: {conv.channel}</p>
        <div className="flex flex-col gap-2">
          <HandoffButton conversationId={conv.id} />
          <ReturnToAiButton conversationId={conv.id} />
        </div>
        <LabInspector conversationId={conv.id} refreshKey={tick} />
      </div>
    </div>
  );
}
