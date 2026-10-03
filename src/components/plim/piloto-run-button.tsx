"use client";

import { useState } from "react";
import { runAutopilotSearch } from "@/app/(app)/plim/operacao-actions";

export function PilotoRunButton({ id, hasSource }: { id: string; hasSource: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="rounded-lg border border-violet-200 px-3 py-1 text-xs font-medium text-violet-800"
        onClick={async () => {
          if (!hasSource) {
            setMsg("Fonte de busca automática não configurada.");
            return;
          }
          const r = await runAutopilotSearch(id);
          setMsg(r.error ?? "Executado.");
        }}
      >
        Buscar ofertas
      </button>
      {msg && <p className="mt-1 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
