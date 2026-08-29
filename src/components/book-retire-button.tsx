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
      `Excluir o book “${name}”? A IA para de vender os produtos deste arquivo. Os outros books continuam. Vendas já feitas não são apagadas.`,
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
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void retire()}>
        {busy ? "Excluindo..." : "Excluir book"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
