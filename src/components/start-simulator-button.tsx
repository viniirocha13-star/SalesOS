"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartSimulatorButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/conversations/simulate", { method: "POST" });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.id) {
      setError("Não foi possível abrir o simulador.");
      return;
    }
    router.push(`/conversas/${json.id}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
