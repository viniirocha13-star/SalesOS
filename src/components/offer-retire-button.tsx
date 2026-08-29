"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OfferRetireButton({ offerId, name }: { offerId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function retire() {
    const ok = window.confirm(
      `Retirar “${name}” da IA? Os outros planos aprovados continuam. Não é preciso enviar um book novo.`,
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/offers/${offerId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Não foi possível retirar este plano.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void retire()}>
        {busy ? "Retirando..." : "Retirar da IA"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
