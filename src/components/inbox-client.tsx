"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LeadBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
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

type Detail = {
  aiEnabled: boolean;
  salesStage: string;
  lead: { name: string | null; phone: string; city: string | null; status: LeadStatus; score: number; productInterest: string | null };
  messages: { id: string; actor: string; body: string; createdAt: string; status?: string }[];
};

export function InboxClient() {
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState<Row[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  async function loadList() {
    try {
      const res = await fetch(`/api/inbox?filter=${filter}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar inbox");
      setList(json.conversations ?? []);
      setError("");
    } catch {
      setError("Não foi possível carregar as conversas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function open(id: string, silent = false) {
    if (!silent) setActive(id);
    const res = await fetch(`/api/inbox/${id}`);
    if (!res.ok) {
      if (!silent) {
        setDetail(null);
        setError("Não foi possível abrir a conversa.");
      }
      return;
    }
    setDetail(await res.json());
  }

  useEffect(() => {
    void loadList();
    const t = setInterval(() => void loadList(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll inbox
  }, [filter]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void open(active, true), 2500);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [detail?.messages.length]);

  const failedOutbound = detail?.messages.some((m) => m.actor !== "CUSTOMER" && m.status === "FAILED");

  return (
    <div className="surface grid h-[calc(100vh-9rem)] grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr_260px]">
      <aside className="flex flex-col border-r border-[#efe6d9]">
        <div className="flex flex-wrap gap-1 border-b border-[#efe6d9] p-3">
          {FILTERS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={cn("rounded-full px-2.5 py-1 text-[11px]", filter === id ? "bg-espresso text-[#f6efe6]" : "bg-[#efe6d9] text-ink/70")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-ink/50">Carregando conversas…</p>}
          {error && (
            <p role="alert" className="p-4 text-sm text-red-600">
              {error}
            </p>
          )}
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`conversation-${c.name ?? c.phone}`}
              aria-label={`Conversa ${c.name ?? c.phone}`}
              onClick={() => open(c.id)}
              className={cn("w-full border-b border-[#efe6d9] px-3 py-3 text-left hover:bg-[#f6f0e8]", active === c.id && "bg-[#efe6d9]")}
            >
              <div className="flex justify-between text-sm">
                <span>{c.name ?? c.phone}</span>
                {c.unread > 0 && <span className="rounded-full bg-terracotta px-1.5 text-[10px] text-white">{c.unread}</span>}
              </div>
              <div className="text-[11px] text-ink/45">
                {c.city ?? "—"} · {c.aiEnabled ? "IA" : "Humano"} · {c.stage}
              </div>
              <div className="truncate text-xs text-ink/60">{c.preview}</div>
            </button>
          ))}
          {!list.length && !loading && <p className="p-4 text-sm text-zinc-500">Nenhuma conversa neste filtro.</p>}
        </div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <div className="flex items-center justify-between border-b border-[#efe6d9] px-4 py-3">
          <div className="font-heading text-xl">{detail?.lead.name ?? "Selecione uma conversa"}</div>
          {active && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                data-testid="assume-conversation"
                disabled={!detail?.aiEnabled}
                onClick={async () => {
                  await fetch(`/api/conversations/${active}/handoff`, { method: "POST" });
                  open(active);
                }}
              >
                Assumir conversa
              </Button>
              <Button
                size="sm"
                variant="secondary"
                data-testid="return-to-ai"
                disabled={detail?.aiEnabled}
                onClick={async () => {
                  await fetch(`/api/conversations/${active}/handoff`, { method: "DELETE" });
                  open(active);
                }}
              >
                Devolver para IA
              </Button>
            </div>
          )}
        </div>
        {failedOutbound && (
          <p role="alert" className="bg-red-50 px-4 py-2 text-xs text-red-700">
            Uma mensagem não foi entregue no WhatsApp. O status aparece como FAILED; o worker tenta de novo automaticamente.
          </p>
        )}
        <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto p-4">
          {!detail && !active && (
            <p className="text-sm text-ink/50">Selecione uma conversa à esquerda para ver mensagens da IA, do cliente e do operador.</p>
          )}
          {detail?.messages.map((m) => (
            <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", actorClass(m.actor))}>
              <div className="text-[10px] uppercase opacity-70">
                {m.actor === "AI" ? "IA" : m.actor === "CUSTOMER" ? "Cliente" : m.actor === "HUMAN" ? "Humano" : "Sistema"}
                {m.status === "FAILED" ? " · falhou" : m.status === "READ" ? " · lida" : m.status === "DELIVERED" ? " · entregue" : ""}
              </div>
              {m.body}
              <div className="mt-1 text-[10px] opacity-60">{formatDateTime(m.createdAt)}</div>
            </div>
          ))}
          {detail && !detail.messages.length && (
            <p className="text-sm text-ink/50">Esta conversa ainda não tem mensagens.</p>
          )}
        </div>
        <div className="flex gap-2 border-t border-[#efe6d9] p-3">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={detail && !detail.aiEnabled ? "Responder como humano..." : "Assuma a conversa para responder"}
            disabled={!detail || detail.aiEnabled}
            aria-label="Mensagem do operador"
            data-testid="human-composer"
          />
          <Button
            data-testid="send-human"
            disabled={!detail || detail.aiEnabled || !text || sending}
            onClick={async () => {
              setSending(true);
              await fetch(`/api/inbox/${active}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: text }),
              });
              setText("");
              setSending(false);
              if (active) open(active);
            }}
          >
            {sending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </section>
      <aside className="hidden space-y-3 overflow-y-auto border-l border-[#efe6d9] bg-[#faf6f0] p-5 text-sm lg:block">
        {detail ? (
          <>
            <h2 className="font-heading text-2xl">Lead</h2>
            <p>{detail.lead.name}</p>
            <p>{detail.lead.phone}</p>
            <p>{detail.lead.city}</p>
            <LeadBadge status={detail.lead.status} />
            <p>Score {detail.lead.score}</p>
            <p>Estágio {detail.salesStage}</p>
            <p>Interesse {detail.lead.productInterest ?? "—"}</p>
            <p className="text-xs text-ink/45">{detail.aiEnabled ? "IA respondendo" : "Humano no comando — IA pausada"}</p>
          </>
        ) : (
          <p className="text-ink/50">Dados da oportunidade aparecem aqui.</p>
        )}
      </aside>
    </div>
  );
}

function actorClass(actor: string) {
  if (actor === "CUSTOMER") return "ml-auto bg-terracotta text-white";
  if (actor === "HUMAN") return "bg-[#dce8df]";
  if (actor === "SYSTEM") return "bg-amber-50 text-amber-950";
  return "bg-[#efe6d9]";
}
