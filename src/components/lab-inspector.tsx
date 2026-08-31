"use client";

import { useEffect, useState } from "react";

type Lab = {
  llm?: string;
  model?: string;
  estimatedCostUsd?: number | null;
  cachedTokens?: number | null;
  salesStage?: string;
  buyingIntent?: string;
  customerFacts?: Record<string, unknown>;
  viability?: unknown;
  eligibleOffers?: unknown;
  presentedOffer?: unknown;
  objection?: { category?: string } | null;
  allowedArguments?: string[];
  forbiddenClaims?: string[];
  toolsCalled?: string[];
  commercialAcceptance?: unknown;
  requiredData?: string[];
  preSaleStatus?: unknown;
  strategyLabel?: string;
  escalationReason?: string | null;
  latencyMs?: number | null;
  tokens?: { in?: number | null; out?: number | null; cached?: number | null };
  launch?: { phase?: string; missing?: string[]; accepted?: boolean; dataComplete?: boolean };
  source?: { bookId?: string | null; sheet?: string | null; row?: number | null };
  routerReason?: string | null;
  labStack?: string | null;
  modelCounts?: { terra?: number; sol?: number; luna?: number };
  conversationCostUsd?: number | null;
};

export function LabInspector({ conversationId, refreshKey }: { conversationId: string; refreshKey: number }) {
  const [lab, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/lab`)
      .then((r) => r.json())
      .then(setLab)
      .catch(() => setLab(null));
  }, [conversationId, refreshKey]);

  if (!lab) return <p className="text-sm text-ink/45">Carregando laboratório…</p>;

  const rows: [string, unknown][] = [
    ["LLM", lab.llm === "openai" || lab.llm === "OPENAI" ? "OPENAI" : lab.llm],
    ["MODEL USED", lab.model],
    ["ROUTER REASON", lab.escalationReason ?? lab.routerReason],
    ["LAB STACK", lab.labStack],
    ["TERRA / SOL / LUNA", lab.modelCounts],
    ["CUSTO TOTAL CONVERSA", formatCost(lab.conversationCostUsd)],
    ["TOKENS ENTRADA", lab.tokens?.in],
    ["TOKENS SAÍDA", lab.tokens?.out],
    ["TOKENS CACHE", lab.tokens?.cached ?? lab.cachedTokens],
    ["CUSTO ESTIMADO", formatCost(lab.estimatedCostUsd)],
    ["SALES STAGE", lab.salesStage],
    ["BUYING INTENT", lab.buyingIntent],
    ["STRATEGY", lab.strategyLabel],
    ["CUSTOMER FACTS", lab.customerFacts],
    ["VIABILITY", lab.viability],
    ["ELIGIBLE OFFERS", lab.eligibleOffers],
    ["PRESENTED OFFER", lab.presentedOffer],
    ["OBJECTION", lab.objection?.category ?? lab.objection],
    ["ALLOWED ARGUMENTS", lab.allowedArguments],
    ["FORBIDDEN CLAIMS", lab.forbiddenClaims],
    ["TOOLS CALLED", lab.toolsCalled],
    ["COMMERCIAL ACCEPTANCE", lab.commercialAcceptance],
    ["REQUIRED DATA", lab.requiredData],
    ["PRE-SALE STATUS", lab.preSaleStatus],
    ["LAUNCH PHASE", lab.launch?.phase],
    ["DADOS FALTANDO", lab.launch?.missing],
    ["BOOK SOURCE", lab.source],
    ["ESCALATION", lab.escalationReason],
    ["LATENCY / TOKENS", `${lab.latencyMs ?? "—"} ms · ${lab.tokens?.in ?? "—"}/${lab.tokens?.out ?? "—"}`],
  ];

  return (
    <div className="space-y-2.5 text-[13px]">
      <h2 className="font-heading text-xl">Laboratório IA</h2>
      <p className="text-[12px] text-ink/45">Metadados da conversa. Sem raciocínio interno.</p>
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl bg-[#efe6d9]/70 px-3 py-2.5">
          <div className="text-[10px] tracking-[0.14em] text-ink/40 uppercase">{label}</div>
          <pre className="mt-1 max-h-28 overflow-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-ink">
            {formatVal(value)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function formatVal(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function formatCost(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `US$ ${value.toFixed(6)}`;
}
