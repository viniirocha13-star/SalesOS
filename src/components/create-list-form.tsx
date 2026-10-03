"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateListForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [days, setDays] = useState("30");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/wa/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              kind,
              filter:
                kind === "DYNAMIC"
                  ? {
                      tag: tag || undefined,
                      lastInteractionBeforeDays: Number(days) || undefined,
                      excludeOptedOut: true,
                    }
                  : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Falha ao criar lista");
            return;
          }
          setName("");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-[15px] font-semibold">Nova lista / segmento</h2>
      <input
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="flex gap-2">
        {(["STATIC", "DYNAMIC"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`h-9 rounded-xl px-3 text-sm font-medium ${
              kind === k ? "bg-[#1fad6c] text-white" : "border border-slate-200"
            }`}
          >
            {k === "STATIC" ? "Estática" : "Dinâmica"}
          </button>
        ))}
      </div>
      {kind === "DYNAMIC" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Tag (opcional)"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
          />
          <input
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            placeholder="Sem interação há X dias"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy || name.trim().length < 2}
        className="h-10 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        Criar
      </button>
    </form>
  );
}
