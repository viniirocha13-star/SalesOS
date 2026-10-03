"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string; meta?: string };

const STEPS = [
  "Nome",
  "Número",
  "Público",
  "Template",
  "Variáveis",
  "Horário",
  "Revisão",
  "Envio",
];

export function CampaignWizard({
  phones,
  templates,
  lists,
}: {
  phones: Option[];
  templates: Option[];
  lists: Option[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState(phones[0]?.id ?? "");
  const [contactListId, setContactListId] = useState(lists[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [estimate, setEstimate] = useState<{
    quantity: number;
    estimate: { estimatedCost: number | null; currency: string; note: string; found: boolean };
  } | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (step === 6 && templateId && contactListId) {
      void fetch("/api/campaigns/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, contactListId }),
      })
        .then((r) => r.json())
        .then(setEstimate)
        .catch(() => undefined);
    }
  }, [step, templateId, contactListId]);

  async function createAndMaybeStart(start: boolean) {
    setBusy(true);
    setError("");
    try {
      let id = campaignId;
      if (!id) {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phoneNumberId,
            templateId,
            contactListId,
            scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Falha ao criar campanha");
          return;
        }
        id = data.campaign.id as string;
        setCampaignId(id);
      }
      if (start && id) {
        const startRes = await fetch(`/api/campaigns/${id}/start`, { method: "POST" });
        const startData = await startRes.json();
        if (!startRes.ok) {
          setError(startData.error ?? "Campanha criada, mas falhou ao iniciar");
          router.push(`/campaigns/${id}`);
          return;
        }
      }
      router.push(id ? `/campaigns/${id}` : "/campaigns");
      router.refresh();
    } catch {
      setError("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              i === step ? "bg-[#1fad6c] text-white" : i < step ? "bg-[#e8f8f0] text-[#148a52]" : "bg-slate-100 text-slate-400"
            }`}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {step === 0 && (
          <Field label="Nome da campanha">
            <input
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Promo Outubro"
            />
          </Field>
        )}
        {step === 1 && (
          <Field label="Número WhatsApp">
            <Select value={phoneNumberId} onChange={setPhoneNumberId} options={phones} />
          </Field>
        )}
        {step === 2 && (
          <Field label="Público (lista)">
            <Select value={contactListId} onChange={setContactListId} options={lists} />
          </Field>
        )}
        {step === 3 && (
          <Field label="Template aprovado">
            <Select value={templateId} onChange={setTemplateId} options={templates} />
          </Field>
        )}
        {step === 4 && (
          <p className="text-sm text-slate-600">
            Variáveis serão preenchidas com o nome do contato por padrão. Mapeamento avançado pode ser
            ajustado depois na API (<code>variableMapping</code>).
          </p>
        )}
        {step === 5 && (
          <Field label="Agendar (opcional)">
            <input
              type="datetime-local"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="mt-1 text-[12px] text-slate-400">Deixe vazio para enviar após a revisão.</p>
          </Field>
        )}
        {step === 6 && (
          <div className="space-y-2 text-sm">
            <Row k="Campanha" v={name} />
            <Row k="Número" v={phones.find((p) => p.id === phoneNumberId)?.label ?? "—"} />
            <Row k="Lista" v={lists.find((l) => l.id === contactListId)?.label ?? "—"} />
            <Row k="Template" v={templates.find((t) => t.id === templateId)?.label ?? "—"} />
            <Row k="Contatos estimados" v={String(estimate?.quantity ?? "…")} />
            <Row
              k="Custo estimado"
              v={
                estimate?.estimate.found && estimate.estimate.estimatedCost != null
                  ? `${estimate.estimate.estimatedCost.toLocaleString("pt-BR", { style: "currency", currency: estimate.estimate.currency })}`
                  : "Tarifa não configurada (sem hardcode)"
              }
            />
            <p className="text-[12px] text-slate-400">{estimate?.estimate.note}</p>
          </div>
        )}
        {step === 7 && (
          <div className="space-y-3 text-sm">
            <p>Pronto para enfileirar os envios. O worker processa com rate limit e retries.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createAndMaybeStart(true)}
              className="h-10 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {scheduledAt ? "Agendar campanha" : "Iniciar envio agora"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createAndMaybeStart(false)}
              className="ml-2 h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium"
            >
              Salvar rascunho
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        {step < 7 && (
          <div className="mt-5 flex justify-between">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-sm disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={
                (step === 0 && name.trim().length < 2) ||
                (step === 1 && !phoneNumberId) ||
                (step === 2 && !contactListId) ||
                (step === 3 && !templateId)
              }
              onClick={() => setStep((s) => s + 1)}
              className="h-9 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <select
      className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.length === 0 && <option value="">Nenhum disponível</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
          {o.meta ? ` · ${o.meta}` : ""}
        </option>
      ))}
    </select>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-2">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium text-right">{v}</span>
    </div>
  );
}
