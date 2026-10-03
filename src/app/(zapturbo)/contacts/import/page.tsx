"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ExternalHelp } from "@/components/external-help";
import { helpLinks } from "@/wa/help-links";

type Preview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  createdRows: number;
  sample: { name?: string; phone: string; ok: boolean; reason?: string }[];
};

export default function ContactsImportPage() {
  const router = useRouter();
  const [fileText, setFileText] = useState("");
  const [fileName, setFileName] = useState("");
  const [consent, setConsent] = useState(false);
  const [listName, setListName] = useState("Importação");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canImport = useMemo(() => consent && preview && preview.validRows > 0, [consent, preview]);

  async function run(dryRun: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: fileText,
          fileName,
          dryRun,
          consentConfirmed: consent,
          listName: listName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha na importação.");
        return;
      }
      setPreview(data.preview ?? data);
      if (!dryRun) {
        router.push("/contacts");
        router.refresh();
      }
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        kicker="Passo 5 · Contatos"
        title="Importar contatos autorizados"
        description="CSV com Nome e Telefone. Confirmamos consentimento antes de gravar. Números vão para E.164."
      />

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            setFileText(await f.text());
            setPreview(null);
          }}
        />
        <input
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
          placeholder="Nome da lista (opcional)"
          value={listName}
          onChange={(e) => setListName(e.target.value)}
        />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Confirmo que minha empresa possui autorização adequada (LGPD) para utilizar esta lista. Não
            importo membros extraídos de grupos de terceiros sem permissão.
          </span>
        </label>
        <ExternalHelp
          compact
          title="O que conta como autorização"
          links={helpLinks(["optIn", "businessPolicy", "lgpdLaw"])}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!fileText || busy}
            onClick={() => void run(true)}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Pré-visualizar
          </button>
          <button
            type="button"
            disabled={!canImport || busy}
            onClick={() => void run(false)}
            className="h-10 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c] disabled:opacity-50"
          >
            Confirmar importação
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>

      {preview && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Encontrados", preview.totalRows],
              ["Válidos", preview.validRows],
              ["Inválidos", preview.invalidRows],
              ["Duplicados", preview.duplicateRows],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="text-lg font-semibold tabular-nums">{value as number}</p>
              </div>
            ))}
          </div>
          <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto text-sm">
            {preview.sample?.map((row, i) => (
              <li key={`${row.phone}-${i}`} className={row.ok ? "text-slate-700" : "text-red-600"}>
                {row.name ?? "—"} · {row.phone}
                {!row.ok && row.reason ? ` — ${row.reason}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
