"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BookRetireButton({ bookId, name }: { bookId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function retire() {
    const ok = window.confirm(
      `Excluir o book “${name}”? Todos os planos deste arquivo saem da IA imediatamente. Vendas já lançadas não são apagadas.`,
    );
    if (!ok) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/offers/books/${bookId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Não foi possível excluir o book.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void retire()}>
        {busy ? "Excluindo..." : "Excluir book"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
