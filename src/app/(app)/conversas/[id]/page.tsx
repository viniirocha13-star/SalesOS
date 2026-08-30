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
  launch?: { phase?: string };
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
            launch: json.launch,
          });
        }
      });
  }, [params.id, tick]);

  if (!conv) return <p className="text-sm text-ink/50">Carregando laboratório…</p>;

  return (
    <div className="grid min-h-0 gap-5 lg:h-[calc(100dvh-8.5rem)] lg:grid-cols-3">
      <div className="flex h-[min(78dvh,calc(100dvh-8.5rem))] min-h-0 flex-col lg:col-span-2 lg:h-full">
        <ChatPanel
          conversationId={conv.id}
          initialMessages={conv.messages}
          providerHint={process.env.NEXT_PUBLIC_LLM_HINT ?? "runtime"}
          handoff={conv.status === "HANDOFF_HUMANO"}
          queued={conv.launch?.phase === "queued"}
          onTurn={() => setTick((n) => n + 1)}
        />
      </div>
      <div className="surface min-h-0 space-y-4 overflow-y-auto p-5 lg:h-full">
        <h2 className="font-heading text-2xl">{conv.lead.name ?? conv.lead.phone}</h2>
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
