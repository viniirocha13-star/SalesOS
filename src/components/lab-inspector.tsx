"use client";

import { useEffect, useState } from "react";

type Lab = {
  model?: string;
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
  tokens?: { in?: number | null; out?: number | null };
};

export function LabInspector({ conversationId, refreshKey }: { conversationId: string; refreshKey: number }) {
  const [lab, setLab] = useState<Lab | null>(null);

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/lab`)
      .then((r) => r.json())
      .then(setLab)
      .catch(() => setLab(null));
  }, [conversationId, refreshKey]);

  if (!lab) return <p className="text-xs text-zinc-500">Carregando laboratório…</p>;

  const rows: [string, unknown][] = [
    ["MODEL USED", lab.model],
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
    ["ESCALATION", lab.escalationReason],
    ["LATENCY / TOKENS", `${lab.latencyMs ?? "—"} ms · ${lab.tokens?.in ?? "—"}/${lab.tokens?.out ?? "—"}`],
  ];

  return (
    <div className="space-y-2 text-xs">
      <h2 className="text-sm font-semibold">Laboratório IA</h2>
      <p className="text-[11px] text-zinc-500">Metadados estruturados. Sem chain-of-thought.</p>
      {rows.map(([label, value]) => (
        <div key={label} className="rounded border bg-zinc-50 p-2">
          <div className="font-medium text-zinc-600">{label}</div>
          <pre className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap">{formatVal(value)}</pre>
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
