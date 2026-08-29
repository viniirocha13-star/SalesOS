"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_LABEL, PIPELINE_ORDER } from "@/domain/pipeline";
import type { Lead, LeadStatus } from "@prisma/client";

export function LeadEditor({ lead }: { lead: Pick<Lead, "id" | "name" | "city" | "neighborhood" | "address" | "zipCode" | "productInterest" | "status"> }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name ?? "",
    city: lead.city ?? "",
    neighborhood: lead.neighborhood ?? "",
    address: lead.address ?? "",
    zipCode: lead.zipCode ?? "",
    productInterest: lead.productInterest ?? "",
    status: lead.status,
  });
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("Salvando...");
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMsg(res.ok ? "Alterações salvas." : "Não foi possível salvar.");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <h2 className="font-semibold">Editar lead</h2>
      <label className="block text-sm">
        Nome
        <input className="mt-1 w-full rounded-md border px-2 py-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="block text-sm">
        Cidade
        <input className="mt-1 w-full rounded-md border px-2 py-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </label>
      <label className="block text-sm">
        Bairro
        <input className="mt-1 w-full rounded-md border px-2 py-1" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
      </label>
      <label className="block text-sm">
        Endereço
        <input className="mt-1 w-full rounded-md border px-2 py-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </label>
      <label className="block text-sm">
        CEP
        <input className="mt-1 w-full rounded-md border px-2 py-1" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
      </label>
      <label className="block text-sm">
        Interesse
        <input className="mt-1 w-full rounded-md border px-2 py-1" value={form.productInterest} onChange={(e) => setForm({ ...form, productInterest: e.target.value })} />
      </label>
      <label className="block text-sm">
        Estágio do pipeline
        <select
          className="mt-1 w-full rounded-md border px-2 py-1"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
        >
          {PIPELINE_ORDER.map((s) => (
            <option key={s} value={s}>
              {PIPELINE_LABEL[s]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm text-white disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar alterações"}
      </button>
      {msg && <p className="text-sm text-zinc-600">{msg}</p>}
    </div>
  );
}
