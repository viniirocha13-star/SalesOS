"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PricingRateForm() {
  const router = useRouter();
  const [market, setMarket] = useState("BR");
  const [category, setCategory] = useState("MARKETING");
  const [rate, setRate] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg("");
        try {
          const res = await fetch("/api/wa/pricing-rates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              market,
              category,
              rate: Number(rate),
              currency: "BRL",
              source: "manual",
            }),
          });
          const data = await res.json();
          setMsg(res.ok ? "Tarifa salva." : data.error ?? "Falha");
          if (res.ok) {
            setRate("");
            router.refresh();
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-[15px] font-semibold">Tarifa Meta (configurável)</h2>
      <p className="text-[12px] text-slate-500">
        Nunca hardcode. Valores por mercado/categoria para estimativas de campanha.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={market}
          onChange={(e) => setMarket(e.target.value.toUpperCase())}
          placeholder="Mercado"
        />
        <select
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="MARKETING">Marketing</option>
          <option value="UTILITY">Utilidade</option>
          <option value="AUTHENTICATION">Autenticação</option>
        </select>
        <input
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Ex.: 0.0625"
          required
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="h-9 rounded-xl bg-[#1fad6c] px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        Salvar tarifa
      </button>
      {msg && <p className="text-[12px] text-slate-500">{msg}</p>}
    </form>
  );
}
