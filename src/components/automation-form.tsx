"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRIGGERS = [
  { value: "CONTACT_REPLIED", label: "Contato respondeu" },
  { value: "MESSAGE_FAILED", label: "Mensagem falhou" },
  { value: "CONTACT_OPTED_OUT", label: "Opt-out" },
  { value: "CAMPAIGN_FINISHED", label: "Campanha finalizada" },
  { value: "CONTACT_CREATED", label: "Contato criado" },
] as const;

const ACTIONS = [
  { value: "ADD_TAG", label: "Adicionar tag", key: "tag" },
  { value: "ADD_TO_LIST", label: "Inserir em lista (ID)", key: "listId" },
  { value: "NOTIFY", label: "Avisar operador (alerta)", key: "note" },
  { value: "WEBHOOK", label: "Webhook (n8n/CRM)", key: "url" },
] as const;

export function AutomationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<(typeof TRIGGERS)[number]["value"]>("CONTACT_REPLIED");
  const [action, setAction] = useState<(typeof ACTIONS)[number]["value"]>("ADD_TAG");
  const [configValue, setConfigValue] = useState("respondeu");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actionMeta = ACTIONS.find((a) => a.value === action)!;

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const res = await fetch("/api/wa/automations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              trigger,
              action,
              actionConfig: { [actionMeta.key]: configValue },
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Falha ao criar");
            return;
          }
          setName("");
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-[15px] font-semibold">Nova automação</h2>
      <p className="text-[12px] text-slate-500">Gatilho → condição simples → ação. n8n só via WEBHOOK.</p>
      <input
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
        value={trigger}
        onChange={(e) => setTrigger(e.target.value as typeof trigger)}
      >
        {TRIGGERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <select
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
        value={action}
        onChange={(e) => setAction(e.target.value as typeof action)}
      >
        {ACTIONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
      <input
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
        placeholder={actionMeta.key}
        value={configValue}
        onChange={(e) => setConfigValue(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="h-10 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        Criar automação
      </button>
    </form>
  );
}
