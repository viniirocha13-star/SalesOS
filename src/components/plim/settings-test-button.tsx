"use client";

import { useState } from "react";

export function SettingsTestButton({
  label = "TESTAR",
  onTest,
}: {
  label?: string;
  onTest: () => Promise<{ ok: boolean; error?: string; detail?: string }>;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={loading}
        className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 disabled:opacity-50"
        onClick={async () => {
          setLoading(true);
          setMsg(null);
          try {
            const r = await onTest();
            setMsg(r.ok ? r.detail ?? "OK" : r.error ?? "Falha");
          } catch (e) {
            setMsg(e instanceof Error ? e.message : String(e));
          } finally {
            setLoading(false);
          }
        }}
      >
        {label}
      </button>
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
