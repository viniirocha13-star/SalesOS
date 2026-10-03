"use client";

import { useRef, useState, useTransition } from "react";

type Props = {
  accept: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  extraFields?: React.ReactNode;
  onImport: (formData: FormData) => Promise<{ imported?: number; blocked?: number; skipped?: number }>;
};

export function PlimFileImport({
  accept,
  label,
  disabled,
  disabledReason,
  extraFields,
  onImport,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (disabled) {
    return (
      <p className="text-sm text-slate-500">
        {disabledReason ?? "Importação disponível apenas para Operador ou Administrador PLIM."}
      </p>
    );
  }

  return (
    <form className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-violet-900">{label}</p>
      {extraFields}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input ref={inputRef} name="file" type="file" accept={accept} className="text-sm" />
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          onClick={() => {
            setError(null);
            setMessage(null);
            const file = inputRef.current?.files?.[0];
            if (!file) {
              setError("Selecione um arquivo");
              return;
            }
            const form = inputRef.current?.closest("form");
            const fd = new FormData(form ?? undefined);
            fd.set("file", file);
            start(async () => {
              try {
                const res = await onImport(fd);
                const parts = [
                  res.imported != null ? `${res.imported} importado(s)` : null,
                  res.skipped != null ? `${res.skipped} ignorado(s)` : null,
                  res.blocked != null ? `${res.blocked} bloqueado(s) por opt-out` : null,
                ].filter(Boolean);
                setMessage(parts.join(" · ") || "Importação concluída");
                if (inputRef.current) inputRef.current.value = "";
              } catch (e) {
                setError(e instanceof Error ? e.message : "Falha na importação");
              }
            });
          }}
        >
          {pending ? "Importando…" : "Importar"}
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
