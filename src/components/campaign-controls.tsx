"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CampaignControls({ campaignId, status }: { campaignId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(action: "start" | "pause" | "resume" | "cancel") {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/${action}`, { method: "POST" });
      const data = await res.json();
      setMsg(data.message ?? data.error ?? "");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-2">
        {["DRAFT", "SCHEDULED", "PAUSED"].includes(status) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("start")}
            className="h-9 rounded-xl bg-[#1fad6c] px-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === "PAUSED" ? "Retomar / iniciar" : "Iniciar"}
          </button>
        )}
        {status === "PAUSED" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("resume")}
            className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-medium"
          >
            Retomar fila
          </button>
        )}
        {["RUNNING", "QUEUING"].includes(status) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("pause")}
            className="h-9 rounded-xl border border-slate-200 px-3 text-sm font-medium"
          >
            Pausar
          </button>
        )}
        {!["COMPLETED", "CANCELLED"].includes(status) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run("cancel")}
            className="h-9 rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700"
          >
            Cancelar
          </button>
        )}
      </div>
      {msg && <p className="text-[12px] text-slate-500">{msg}</p>}
    </div>
  );
}
