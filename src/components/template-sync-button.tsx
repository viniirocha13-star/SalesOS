"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function TemplateSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            const res = await fetch("/api/templates/sync", { method: "POST" });
            const data = await res.json();
            setMsg(data.message ?? data.error ?? "");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Sincronizando…" : "Sincronizar"}
      </button>
      <Link
        href="/templates/new"
        className="inline-flex h-10 items-center rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c]"
      >
        Novo modelo
      </Link>
      {msg && <span className="w-full text-[12px] text-slate-500 sm:w-auto">{msg}</span>}
    </div>
  );
}
