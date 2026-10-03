"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InboxComposer({
  conversationId,
  windowOpen,
  templates,
}: {
  conversationId: string;
  windowOpen: boolean;
  templates: { name: string; language: string }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "template">(windowOpen ? "text" : "template");
  const [body, setBody] = useState("");
  const [templateName, setTemplateName] = useState(templates[0]?.name ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="border-t border-slate-100 px-4 py-3">
      {!windowOpen && (
        <p className="mb-2 text-[12px] text-amber-700">
          Janela encerrada — utilize um template aprovado.
        </p>
      )}
      <div className="mb-2 flex gap-2">
        <button
          type="button"
          disabled={!windowOpen}
          onClick={() => setMode("text")}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
            mode === "text" ? "bg-[#e8f8f0] text-[#148a52]" : "bg-slate-100 text-slate-500"
          } disabled:opacity-40`}
        >
          Mensagem livre
        </button>
        <button
          type="button"
          onClick={() => setMode("template")}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
            mode === "template" ? "bg-[#e8f8f0] text-[#148a52]" : "bg-slate-100 text-slate-500"
          }`}
        >
          Template
        </button>
      </div>
      {mode === "text" ? (
        <textarea
          className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Escreva a resposta…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      ) : (
        <select
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        >
          {templates.length === 0 && <option value="">Nenhum template aprovado</option>}
          {templates.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.language})
            </option>
          ))}
        </select>
      )}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={busy || (mode === "text" ? !body.trim() : !templateName)}
        className="mt-2 h-9 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch(`/api/wa/conversations/${conversationId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                mode === "text"
                  ? { type: "text", body }
                  : { type: "template", templateName },
              ),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? "Falha ao enviar");
              return;
            }
            setBody("");
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        Enviar
      </button>
    </div>
  );
}
