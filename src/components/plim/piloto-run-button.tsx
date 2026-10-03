"use client";

import { useState } from "react";
import { runAutopilotSearch } from "@/app/(app)/plim/operacao-actions";

export function PilotoRunButton({ id }: { id: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="rounded-lg border border-violet-200 px-3 py-1 text-xs font-medium text-violet-800"
        onClick={async () => {
          const r = await runAutopilotSearch(id);
          if ("error" in r && r.error) {
            setMsg(r.error);
            return;
          }
          setMsg("message" in r && r.message ? r.message : "Piloto executado.");
        }}
      >
        Executar piloto
      </button>
      {msg && <p className="mt-1 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
