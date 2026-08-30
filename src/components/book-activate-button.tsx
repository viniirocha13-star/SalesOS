"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function BookActivateButton({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function activate() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/offers/books/${bookId}/activate`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("Não foi possível ativar o book.");
      return;
    }
    router.refresh();
    router.push("/conhecimento");
  }

  return (
    <div>
      <Button onClick={activate} disabled={busy} className="bg-emerald-700 hover:bg-emerald-800">
        {busy ? "Ativando…" : "Aprovar e ativar este book"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
