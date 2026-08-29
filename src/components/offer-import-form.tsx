"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function OfferImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function upload() {
    if (!file) {
      setStatus("Selecione um arquivo CSV, XLSX ou PDF.");
      return;
    }
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
      <label className="text-sm font-medium" htmlFor="book-file">
        Arquivo do book
      </label>
      <input id="book-file" type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button onClick={upload} disabled={!file} className="bg-orange-500 hover:bg-orange-600">
        {status.startsWith("Importando") ? "Enviando..." : "Enviar book"}
      </Button>
      {status && <p role="status" className="text-xs text-zinc-500">{status}</p>}
    </div>
  );
}
