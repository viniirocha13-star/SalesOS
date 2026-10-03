"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyExampleValues } from "@/lib/template-preview";

const CATEGORIES = [
  { value: "UTILITY", label: "Utilidade" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Autenticação" },
] as const;

export function TemplateEditor() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("UTILITY");
  const [language, setLanguage] = useState("pt_BR");
  const [headerText, setHeaderText] = useState("");
  const [body, setBody] = useState("Olá, {{1}}.\n\nSeu pedido {{2}} foi atualizado.\n\nStatus: {{3}}");
  const [footer, setFooter] = useState("");
  const [examples, setExamples] = useState(["Maria", "#1842", "Saiu para entrega"]);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const vars = useMemo(() => {
    const found = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    return [...new Set(found)].sort((a, b) => a - b);
  }, [body]);

  const preview = applyExampleValues(body, examples);

  async function save(submit: boolean) {
    setBusy(true);
    setError("");
    setWarnings([]);
    try {
      const create = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          language,
          headerText: headerText || null,
          body,
          footer: footer || null,
          exampleValues: vars.map((i) => examples[i - 1] ?? `ex${i}`),
        }),
      });
      const data = await create.json();
      if (!create.ok) {
        setError(data.error ?? "Falha ao salvar");
        if (data.details?.errors) setError(data.details.errors.join(" "));
        if (data.details?.warnings) setWarnings(data.details.warnings);
        return;
      }
      if (data.validation?.warnings) setWarnings(data.validation.warnings);
      if (submit && data.template?.id) {
        const sub = await fetch(`/api/templates/${data.template.id}/submit`, { method: "POST" });
        const subData = await sub.json();
        if (!sub.ok) {
          setError(subData.error ?? "Salvo como rascunho, mas falhou o envio à Meta.");
          return;
        }
      }
      router.push("/templates");
      router.refresh();
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500">Nome interno (API)</label>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="pedido_atualizado"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-500">Categoria solicitada</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-slate-500">Idioma</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500">Cabeçalho</label>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            maxLength={60}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500">Corpo</label>
          <textarea
            className="min-h-36 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500">Rodapé</label>
          <input
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            maxLength={60}
          />
        </div>
        {vars.length > 0 && (
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-slate-500">Valores de exemplo</p>
            {vars.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="w-12 text-xs text-slate-400">{`{{${n}}}`}</span>
                <input
                  className="h-9 flex-1 rounded-xl border border-slate-200 px-3 text-sm"
                  value={examples[n - 1] ?? ""}
                  onChange={(e) => {
                    const next = [...examples];
                    while (next.length < n) next.push("");
                    next[n - 1] = e.target.value;
                    setExamples(next);
                  }}
                />
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {warnings.map((w) => (
          <p key={w} className="text-sm text-amber-700">
            {w}
          </p>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !name || !body}
            onClick={() => void save(false)}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            disabled={busy || !name || !body}
            onClick={() => void save(true)}
            className="h-10 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white hover:bg-[#18965c] disabled:opacity-50"
          >
            Enviar para análise Meta
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          A Meta decide a categoria final. Não prometemos aprovação nem classificação.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-[#0b1f17] p-5 text-white shadow-sm">
        <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">Preview WhatsApp</p>
        <div className="mt-4 max-w-sm rounded-2xl bg-[#dcf8c6] p-3 text-slate-900 shadow">
          {headerText && <p className="mb-1 text-sm font-semibold">{headerText}</p>}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{preview}</p>
          {footer && <p className="mt-2 text-[11px] text-slate-500">{footer}</p>}
          <p className="mt-2 text-right text-[10px] text-slate-500">agora</p>
        </div>
        <p className="mt-4 text-[12px] text-white/50">Categoria solicitada: {category}</p>
      </div>
    </div>
  );
}
