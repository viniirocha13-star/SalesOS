"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function IntegrationTestButton({ slug }: { slug: "whatsapp" | "openai" }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setStatus("Testando…");
          const res = await fetch("/api/admin/integrations/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug }),
          });
          const json = await res.json();
          setBusy(false);
          setStatus(json.ok ? `Conectado (${json.latencyMs ?? "—"} ms)` : json.error ?? "Falha");
        }}
      >
        Testar conexão
      </Button>
      {status && <p className="text-xs text-zinc-500">{status}</p>}
    </div>
  );
}
