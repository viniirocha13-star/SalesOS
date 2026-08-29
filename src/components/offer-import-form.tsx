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
    setStatus("Importando planos do arquivo...");
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/offers/import", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setStatus(json.error ?? "Falha ao importar o book.");
      return;
    }
    setStatus(
      `${json.offers?.length ?? 0} produtos já estão na IA, somados aos books anteriores.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-800" htmlFor="book-file">
        Arquivo do book vigente
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
          {status.startsWith("Importando") ? "Enviando..." : "Enviar book para a IA"}
        </Button>
        <a className="text-sm text-teal underline" href="/samples/book-ofertas-exemplo.csv">
          Baixar CSV de exemplo
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
