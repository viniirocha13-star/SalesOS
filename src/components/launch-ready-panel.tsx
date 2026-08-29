"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

export type LaunchInfo = {
  phase: "selling" | "collecting" | "ready" | "queued";
  accepted: boolean;
  fields: { key: string; label: string; ok: boolean }[];
  missing: string[];
  preSaleId: string | null;
  offerName: string | null;
  offerId: string | null;
  leadName: string | null;
};

export function LaunchReadyPanel({ launch, leadId }: { launch: LaunchInfo; leadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openLaunch(preSaleId: string) {
    router.push(`/operacao/${preSaleId}`);
  }

  async function prepare() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/operation/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error === "sem_oferta_aceita" ? "Ainda não há aceite de um plano do book." : "Não foi possível abrir o lançamento.");
      return;
    }
    await openLaunch(json.preSaleId);
  }

  if (launch.phase === "selling") return null;

  return (
    <div className="rounded-2xl border border-teal/30 bg-white p-4">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-teal uppercase">Lançar pedido</p>
      {launch.offerName && <p className="mt-1 text-sm font-medium">{launch.offerName}</p>}
      <p className="mt-1 text-xs text-slate-500">
        {launch.phase === "collecting" && "Aguardando o cliente enviar os dados do plano."}
        {launch.phase === "ready" && "Cliente enviou os dados. Lance no sistema."}
        {launch.phase === "queued" && "Cliente enviou os dados. Lance no sistema."}
      </p>
      <ul className="mt-3 space-y-1.5">
        {launch.fields.map((f) => (
          <li key={f.key} className="flex items-center gap-2 text-sm">
            {f.ok ? <CheckCircle2 className="size-4 text-teal" /> : <Circle className="size-4 text-slate-300" />}
            <span className={f.ok ? "text-slate-800" : "text-slate-400"}>{f.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        {launch.preSaleId ? (
          <Button className="w-full" onClick={() => openLaunch(launch.preSaleId!)}>
            Lançar no sistema
          </Button>
        ) : launch.phase === "ready" ? (
          <Button className="w-full" disabled={busy} onClick={() => void prepare()}>
            {busy ? "Abrindo..." : "Lançar no sistema"}
          </Button>
        ) : (
          <p className="text-xs text-slate-400">O botão aparece quando o cliente terminar de enviar os dados.</p>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
