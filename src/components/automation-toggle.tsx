"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AutomationToggle({ id, enabled }: { id: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/wa/automations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, enabled: !enabled }),
        });
        router.refresh();
        setBusy(false);
      }}
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        enabled ? "bg-[#e8f8f0] text-[#148a52]" : "bg-slate-100 text-slate-500"
      }`}
    >
      {enabled ? "Ativa" : "Pausada"}
    </button>
  );
}
