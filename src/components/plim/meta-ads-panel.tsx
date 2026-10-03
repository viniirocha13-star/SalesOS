"use client";

import { useState } from "react";
import { saveMetaAdsToken } from "@/app/(app)/plim/analytics-actions";

type Props = {
  configured: boolean;
  fromEnv: boolean;
  canConfigure: boolean;
};

export function MetaAdsPanel({ configured, fromEnv, canConfigure }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-violet-950">Meta Ads</h3>
      <p className="mt-1 text-xs text-slate-500">
        Sync oficial via Marketing API (contas de anúncios). Métricas de campanha não são estimadas — apenas
        conexão e estrutura de sync documentada.
      </p>
      {configured ? (
        <p className="mt-2 text-sm text-emerald-700">
          Configurado {fromEnv ? "via META_ADS_TOKEN no servidor" : "com token salvo no workspace"}.
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-700">Não configurado — defina META_ADS_TOKEN ou salve o token abaixo.</p>
      )}
      {canConfigure && !fromEnv && (
        <form
          className="mt-3 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await saveMetaAdsToken(new FormData(e.currentTarget));
              setTestResult("Token salvo no servidor.");
            } catch (err) {
              setTestResult(err instanceof Error ? err.message : "Erro ao salvar");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block text-xs font-medium text-slate-600">Token (armazenado apenas no servidor)</label>
          <input
            name="metaAdsToken"
            type="password"
            className="w-full rounded border border-slate-200 px-2 py-1 text-sm"
            placeholder="EAA…"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar token"}
          </button>
        </form>
      )}
      <button
        type="button"
        disabled={!configured || testing}
        className="mt-3 rounded-lg border border-violet-200 px-3 py-1.5 text-sm text-violet-800 disabled:opacity-40"
        onClick={async () => {
          setTesting(true);
          setTestResult(null);
          try {
            const res = await fetch("/api/plim/meta-ads/test", { method: "POST" });
            const json = (await res.json()) as { adAccountId?: string; error?: string };
            if (!res.ok) throw new Error(json.error ?? "Falha no teste");
            setTestResult(`Conexão OK — conta ${json.adAccountId}`);
          } catch (err) {
            setTestResult(err instanceof Error ? err.message : "Erro");
          } finally {
            setTesting(false);
          }
        }}
      >
        {testing ? "Testando…" : "TESTAR"}
      </button>
      {!configured && (
        <p className="mt-1 text-xs text-slate-400">Configure o token para habilitar o teste.</p>
      )}
      {testResult && <p className="mt-2 text-sm text-slate-700">{testResult}</p>}
    </div>
  );
}
