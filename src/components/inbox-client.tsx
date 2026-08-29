"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LeadBadge } from "@/components/status-badge";
import type { LeadStatus } from "@prisma/client";

const FILTERS = [
  ["all", "Todos"],
  ["ai", "IA atendendo"],
  ["human", "Humano"],
  ["new", "Novos"],
  ["negotiating", "Negociando"],
  ["presale", "Pré-venda"],
  ["pending", "Pendência"],
  ["waiting", "Aguardando cliente"],
  ["done", "Finalizados"],
] as const;

type Row = {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  preview: string;
  unread: number;
  stage: string;
  aiEnabled: boolean;
  score: number;
};

export function InboxClient() {
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState<Row[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    aiEnabled: boolean;
    salesStage: string;
    lead: { name: string | null; phone: string; city: string | null; status: LeadStatus; score: number; productInterest: string | null };
    messages: { id: string; actor: string; body: string; createdAt: string }[];
  } | null>(null);
  const [text, setText] = useState("");

  async function loadList() {
    const res = await fetch(`/api/inbox?filter=${filter}`);
    const json = await res.json();
    setList(json.conversations ?? []);
  }

  async function open(id: string) {
    setActive(id);
    const res = await fetch(`/api/inbox/${id}`);
    setDetail(await res.json());
  }

  useEffect(() => {
    void loadList();
    const t = setInterval(() => void loadList(), 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll inbox
  }, [filter]);

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 overflow-hidden rounded-xl border bg-white lg:grid-cols-[280px_1fr_280px]">
      <aside className="flex flex-col border-r">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn("rounded-full px-2 py-0.5 text-[11px]", filter === id ? "bg-[#0f3d38] text-white" : "bg-zinc-100")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map((c) => (
            <button
              key={c.id}
              onClick={() => open(c.id)}
              className={cn("w-full border-b px-3 py-2 text-left hover:bg-zinc-50", active === c.id && "bg-orange-50")}
            >
              <div className="flex justify-between text-sm font-medium">
                <span>{c.name ?? c.phone}</span>
                {c.unread > 0 && <span className="rounded-full bg-orange-500 px-1.5 text-[10px] text-white">{c.unread}</span>}
              </div>
              <div className="text-[11px] text-zinc-500">
                {c.city ?? "—"} · {c.aiEnabled ? "IA" : "Humano"} · {c.stage}
              </div>
              <div className="truncate text-xs text-zinc-600">{c.preview}</div>
            </button>
          ))}
          {!list.length && <p className="p-4 text-sm text-zinc-500">Nenhuma conversa neste filtro.</p>}
        </div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm font-medium">{detail?.lead.name ?? "Selecione uma conversa"}</div>
          {active && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => { await fetch(`/api/conversations/${active}/handoff`, { method: "POST" }); open(active); }}>
                Assumir conversa
              </Button>
              <Button size="sm" variant="secondary" onClick={async () => { await fetch(`/api/conversations/${active}/handoff`, { method: "DELETE" }); open(active); }}>
                Devolver para IA
              </Button>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {detail?.messages.map((m) => (
            <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", actorClass(m.actor))}>
              <div className="text-[10px] uppercase opacity-70">{m.actor}</div>
              {m.body}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={detail && !detail.aiEnabled ? "Responder como humano..." : "Assuma a conversa para responder"}
            disabled={!detail || detail.aiEnabled}
          />
          <Button
            disabled={!detail || detail.aiEnabled || !text}
            onClick={async () => {
              await fetch(`/api/inbox/${active}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
              setText("");
              if (active) open(active);
            }}
          >
            Enviar
          </Button>
        </div>
      </section>
      <aside className="hidden space-y-3 overflow-y-auto border-l p-4 text-sm lg:block">
        {detail ? (
          <>
            <h2 className="font-semibold">Lead</h2>
            <p>{detail.lead.name}</p>
            <p>{detail.lead.phone}</p>
            <p>{detail.lead.city}</p>
            <LeadBadge status={detail.lead.status} />
            <p>Score {detail.lead.score}</p>
            <p>Estágio {detail.salesStage}</p>
            <p>Interesse {detail.lead.productInterest ?? "—"}</p>
            <p className="text-xs text-zinc-500">{detail.aiEnabled ? "IA respondendo" : "Humano no comando — IA pausada"}</p>
          </>
        ) : (
          <p className="text-zinc-500">Dados da oportunidade aparecem aqui.</p>
        )}
      </aside>
    </div>
  );
}

function actorClass(actor: string) {
  if (actor === "CUSTOMER") return "ml-auto bg-orange-500 text-white";
  if (actor === "HUMAN") return "bg-emerald-100";
  if (actor === "SYSTEM") return "bg-amber-50 text-amber-900";
  return "bg-zinc-100";
}
