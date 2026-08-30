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
      setStatus("Selecione o book atual em CSV, XLSX ou PDF.");
      return;
    }
    setStatus("Processando abas, normalizando e validando...");
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/offers/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "Falha ao importar o book.");
      return;
    }
    router.push(`/ofertas/books/${json.book.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-800" htmlFor="book-file">
        Arquivo do book vigente (todas as abas)
      </label>
      <input
        id="book-file"
        type="file"
        accept=".csv,.xlsx,.xls,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={upload} disabled={!file}>
          {status.startsWith("Processando") ? "Enviando..." : "Enviar book para revisão"}
        </Button>
        <a className="text-sm text-teal underline" href="/samples/Ofertas_Brisanet_Fortaleza__CE_.xlsx">
          Baixar book Fortaleza (fixture)
        </a>
      </div>
      {status && (
        <p role="status" className="text-sm text-slate-600">
          {status}
        </p>
      )}
    </div>
  );
}
