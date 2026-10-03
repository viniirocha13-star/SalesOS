"use client";

import { useState } from "react";
import { testChannelConnection } from "@/app/(app)/plim/operacao-actions";

export function ChannelTestButton({ platform }: { platform: "WHATSAPP" | "TELEGRAM" | "INSTAGRAM" }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white"
        onClick={async () => {
          const r = await testChannelConnection(platform);
          setMsg(r.ok ? "Conexão OK" : r.error ?? "Falha");
        }}
      >
        TESTAR
      </button>
      {msg && <p className="mt-2 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
