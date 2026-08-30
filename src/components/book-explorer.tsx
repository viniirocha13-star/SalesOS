"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = {
  book?: { name: string };
  answers?: string[];
  offers?: { id: string; name: string; sourceSheet?: string | null; sourceRow?: number | null }[];
  error?: string;
};

export function BookExplorer() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask(query = q) {
    if (query.trim().length < 3) return;
    setBusy(true);
    const res = await fetch(`/api/books/explore?q=${encodeURIComponent(query)}`);
    setData(await res.json());
    setBusy(false);
  }

  const samples = [
    "Quais planos têm Netflix?",
    "Quais combos abaixo de R$130?",
    "Quais ofertas de fibra estão vigentes?",
    "Quais planos têm WhatsApp ilimitado?",
    "Qual plano inclui Amazon Prime?",
    "Tem plano de 700 Mega?",
    "Qual plano móvel tem mais internet?",
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void ask()}
          placeholder="Pergunte só com o book ativo…"
          data-testid="book-explorer-q"
        />
        <Button onClick={() => void ask()} disabled={busy}>
          {busy ? "Consultando…" : "Perguntar"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {samples.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-[#efe6d9] bg-white px-3 py-1 text-xs"
            onClick={() => {
              setQ(s);
              void ask(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
      {data?.error && <p className="text-sm text-amber-800">{data.error}</p>}
      {data?.answers && (
        <ul className="space-y-2 text-sm">
          {!data.answers.length && <li className="text-slate-500">Nenhuma oferta do book corresponde.</li>}
          {data.answers.map((line) => (
            <li key={line} className="rounded-xl bg-[#efe6d9]/60 px-3 py-2">
              {line}
            </li>
          ))}
        </ul>
      )}
      {data?.offers?.length ? (
        <p className="text-[11px] text-ink/45">
          Fontes internas: {data.offers.map((o) => `${o.sourceSheet ?? "?"}#${o.sourceRow ?? "?"}`).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
