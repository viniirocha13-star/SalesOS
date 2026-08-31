"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const STACKS = [
  { id: "luna", label: "Luna" },
  { id: "terra", label: "Terra" },
  { id: "terra_sol", label: "Terra + Sol Router" },
] as const;

export function StartSimulatorButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<(typeof STACKS)[number]["id"]>("terra_sol");

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/conversations/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labStack: stack }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.id) {
      setError("Não foi possível abrir o simulador.");
      return;
    }
    router.push(`/conversas/${json.id}`);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <span className="text-[11px] tracking-[0.12em] uppercase">Stack</span>
        <select
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          value={stack}
          onChange={(e) => setStack(e.target.value as typeof stack)}
          data-testid="lab-stack"
        >
          {STACKS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        type="button"
        data-testid="new-simulator"
        onClick={start}
        disabled={busy}
        className="h-11 rounded-xl px-5"
      >
        {busy ? "Abrindo…" : "Nova conversa simulada"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
