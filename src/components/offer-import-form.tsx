"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function OfferImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function upload() {
    if (!file) return;
    setStatus("Importando e detectando ofertas...");
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/offers/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "Falha");
      return;
    }
    setStatus(`${json.offers?.length ?? 0} ofertas detectadas — aguardando aprovação.`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-white p-3">
      <input type="file" accept=".csv,.xlsx,.xls,.pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button onClick={upload} disabled={!file} className="bg-orange-500 hover:bg-orange-600">
        Enviar book
      </Button>
      {status && <p className="text-xs text-zinc-500">{status}</p>}
    </div>
  );
}
