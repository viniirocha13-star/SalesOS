"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LeadBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import type { LeadStatus } from "@prisma/client";
import { CheckCircle2, Clock3, Filter, RefreshCw, Send, UserRound } from "lucide-react";

type Lane = "arriving" | "waiting_ai" | "waiting_human" | "with_data";

type Row = {
  id: string;
  name: string | null;
  phone: string;
  city: string | null;
  preview: string;
  at: string | null;
  unread: number;
  stage: string;
  aiEnabled: boolean;
  score: number;
  channel: string;
  lastActor: string | null;
  dataFlags: string[];
  lane: Lane;
  handoffReason: string | null;
};

type Stats = {
  arriving: number;
  waiting_ai: number;
  waiting_human: number;
  with_data: number;
  startedToday: number;
  aiRepliesToday: number;
  handoffsToday: number;
  negotiations: number;
  salesToday: number;
  avgLatencySec: number;
  aiSuccessPct: number;
};

type Detail = {
  aiEnabled: boolean;
  salesStage: string;
  lead: { name: string | null; phone: string; city: string | null; status: LeadStatus; score: number; productInterest: string | null };
  messages: { id: string; actor: string; body: string; createdAt: string; status?: string }[];
};

const LANES: { id: Lane; title: string; tone: string; badge: (c: Row) => string }[] = [
  { id: "arriving", title: "Clientes chegando agora", tone: "text-emerald-700", badge: () => "Novo" },
  { id: "waiting_ai", title: "Aguardando resposta da IA", tone: "text-amber-700", badge: () => "IA analisando" },
  { id: "waiting_human", title: "Aguardando humano", tone: "text-violet-700", badge: (c) => humanBadge(c.handoffReason) },
  { id: "with_data", title: "Clientes que enviaram dados", tone: "text-sky-700", badge: () => "Dados" },
];

export function InboxClient() {
  const [list, setList] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sort, setSort] = useState<"recent" | "old">("recent");
  const scroller = useRef<HTMLDivElement>(null);

  async function loadList() {
    try {
      const res = await fetch("/api/inbox?filter=all");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar inbox");
      setList(json.conversations ?? []);
      setStats(json.stats ?? null);
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
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => void open(active, true), 2500);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [detail?.messages.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = list.filter((c) => !q || `${c.name} ${c.phone} ${c.preview}`.toLowerCase().includes(q));
    return [...rows].sort((a, b) => {
      const da = a.at ? new Date(a.at).getTime() : 0;
      const db = b.at ? new Date(b.at).getTime() : 0;
      return sort === "recent" ? db - da : da - db;
    });
  }, [list, query, sort]);

  const failedOutbound = detail?.messages.some((m) => m.actor !== "CUSTOMER" && m.status === "FAILED");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Inbox de Conversas</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            Todas as conversas em tempo real
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <Filter className="size-3.5" /> Filtros
          </span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversa ou cliente..."
            className="h-10 w-64 rounded-xl"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard color="emerald" icon={<Send className="size-4" />} label="Chegando agora" value={stats?.arriving ?? 0} hint="Novas conversas" />
        <SummaryCard color="amber" icon={<Clock3 className="size-4" />} label="Aguardando IA" value={stats?.waiting_ai ?? 0} hint="IA analisando / sem resposta" />
        <SummaryCard color="violet" icon={<UserRound className="size-4" />} label="Aguardando humano" value={stats?.waiting_human ?? 0} hint="IA não conseguiu / escaladas" />
        <SummaryCard color="sky" icon={<CheckCircle2 className="size-4" />} label="Com dados" value={stats?.with_data ?? 0} hint="Clientes enviaram dados" />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => void loadList()}>
          <RefreshCw className="size-3.5" /> Atualizar agora
        </Button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "recent" | "old")}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
        >
          <option value="recent">Ordenar: Mais recentes</option>
          <option value="old">Ordenar: Mais antigas</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-slate-500">Carregando conversas…</p>}

      <div className="grid gap-3 xl:grid-cols-4">
        {LANES.map((lane) => {
          const cards = filtered.filter((c) => c.lane === lane.id);
          return (
            <section key={lane.id} className="surface flex min-h-[28rem] flex-col p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className={cn("text-[11px] font-semibold tracking-[0.08em] uppercase", lane.tone)}>
                  {lane.title} ({cards.length})
                </h3>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    data-testid={`conversation-${c.name ?? c.phone}`}
                    aria-label={`Conversa ${c.name ?? c.phone}`}
                    onClick={() => open(c.id)}
                    className={cn(
                      "w-full rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-left hover:border-slate-200 hover:bg-white",
                      active === c.id && "border-teal bg-white ring-1 ring-teal/30",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600">
                        {initials(c.name ?? c.phone)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{c.name ?? c.phone}</span>
                          <span className="text-[11px] text-slate-400">{timeAgo(c.at)}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">{c.preview || "Sem mensagem ainda"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {c.channel === "WHATSAPP" && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">WA</span>
                          )}
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", laneChip(lane.id))}>{lane.badge(c)}</span>
                          {lane.id === "with_data" &&
                            c.dataFlags.map((f) => (
                              <span key={f} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700">
                                {f}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {!cards.length && !loading && <p className="px-1 text-xs text-slate-400">Nenhuma conversa nesta coluna.</p>}
              </div>
              <p className="mt-2 px-1 text-[11px] text-slate-400">Ver todas ({cards.length})</p>
            </section>
          );
        })}
      </div>

      {active && (
        <div className="surface grid overflow-hidden lg:grid-cols-[1fr_260px]">
          <section className="flex min-h-[28rem] min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold">{detail?.lead.name ?? "Conversa"}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="assume-conversation"
                  disabled={!detail || !detail.aiEnabled}
                  onClick={async () => {
                    await fetch(`/api/conversations/${active}/handoff`, { method: "POST" });
                    open(active);
                    loadList();
                  }}
                >
                  Assumir conversa
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  data-testid="return-to-ai"
                  disabled={!detail || detail.aiEnabled}
                  onClick={async () => {
                    await fetch(`/api/conversations/${active}/handoff`, { method: "DELETE" });
                    open(active);
                    loadList();
                  }}
                >
                  Devolver para IA
                </Button>
              </div>
            </div>
            {failedOutbound && (
              <p role="alert" className="bg-red-50 px-4 py-2 text-xs text-red-700">
                Uma mensagem não foi entregue no WhatsApp. O worker tenta de novo automaticamente.
              </p>
            )}
            <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto p-4">
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
            </div>
            <div className="flex gap-2 border-t border-slate-100 p-3">
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
          <aside className="space-y-3 border-l border-slate-100 bg-slate-50 p-5 text-sm">
            <h2 className="text-lg font-semibold">Lead</h2>
            {detail ? (
              <>
                <p>{detail.lead.name}</p>
                <p>{detail.lead.phone}</p>
                <p>{detail.lead.city}</p>
                <LeadBadge status={detail.lead.status} />
                <p>Score {detail.lead.score}</p>
                <p>Estágio {detail.salesStage}</p>
                <p>Interesse {detail.lead.productInterest ?? "—"}</p>
                <p className="text-xs text-slate-500">{detail.aiEnabled ? "IA respondendo" : "Humano no comando — IA pausada"}</p>
              </>
            ) : (
              <p className="text-slate-500">Abrindo conversa…</p>
            )}
          </aside>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-1">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">Resumo do dia</h3>
          <ul className="mt-3 space-y-2.5 text-sm">
            <Metric label="Conversas iniciadas" value={stats?.startedToday ?? 0} />
            <Metric label="Respostas da IA" value={stats?.aiRepliesToday ?? 0} />
            <Metric label="Escaladas p/ humano" value={stats?.handoffsToday ?? 0} />
            <Metric label="Negociações iniciadas" value={stats?.negotiations ?? 0} />
            <Metric label="Vendas fechadas" value={stats?.salesToday ?? 0} />
          </ul>
        </div>
        <div className="surface flex items-center gap-4 p-5">
          <div
            className="relative size-24 shrink-0 rounded-full"
            style={{
              background: `conic-gradient(#0f9f8a 0 ${stats?.aiSuccessPct ?? 0}%, #e2e8f0 0)`,
            }}
          >
            <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-white text-center">
              <span className="text-lg font-semibold">{stats?.aiSuccessPct ?? 0}%</span>
              <span className="text-[9px] text-slate-400">sucesso</span>
            </div>
          </div>
          <div>
            <h3 className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">Performance da IA</h3>
            <p className="mt-1 text-sm text-slate-600">Conversas ainda com a IA ativa, nas últimas cargas desta tela.</p>
          </div>
        </div>
        <div className="surface p-5">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">Tempo médio de resposta</h3>
          <p className="mt-2 text-3xl font-semibold">{(stats?.avgLatencySec ?? 0).toString().replace(".", ",")}s</p>
          <p className="text-sm text-slate-500">Tempo médio da IA (24h)</p>
          <svg viewBox="0 0 200 48" className="mt-3 h-12 w-full text-teal">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              points="0,30 20,28 40,22 60,26 80,18 100,20 120,16 140,22 160,14 180,18 200,12"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  color,
  icon,
  label,
  value,
  hint,
}: {
  color: "emerald" | "amber" | "violet" | "sky";
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  const wrap = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    sky: "bg-sky-50 text-sky-700",
  }[color];
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className={cn("flex size-10 items-center justify-center rounded-xl", wrap)}>{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-[11px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.round(mins / 60);
  return `${h} h`;
}

function humanBadge(reason: string | null) {
  if (reason === "CLIENTE_SOLICITOU") return "Solicitou humano";
  if (reason === "CASO_SENSIVEL" || reason === "EXCECAO_COMERCIAL") return "Caso complexo";
  if (reason === "IA_SEM_CONFIANCA") return "Não entendeu";
  if (reason) return "Escalado";
  return "Escalado";
}

function laneChip(lane: Lane) {
  if (lane === "arriving") return "bg-emerald-100 text-emerald-800";
  if (lane === "waiting_ai") return "bg-amber-100 text-amber-800";
  if (lane === "waiting_human") return "bg-violet-100 text-violet-800";
  return "bg-sky-100 text-sky-800";
}

function actorClass(actor: string) {
  if (actor === "CUSTOMER") return "ml-auto bg-teal text-white";
  if (actor === "HUMAN") return "bg-violet-50 text-violet-950";
  if (actor === "SYSTEM") return "bg-amber-50 text-amber-950";
  return "bg-slate-100";
}
