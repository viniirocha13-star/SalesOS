"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="surface max-w-xl space-y-5 p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            legalName: form.get("legalName") || null,
            taxId: form.get("taxId") || null,
            website: form.get("website") || null,
            phone: form.get("phone") || null,
            email: form.get("email") || null,
            description: form.get("description") || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setLoading(false);
          setError(data.error ?? "Não foi possível criar a empresa.");
          return;
        }
        router.push("/onboarding?step=meta");
        router.refresh();
      }}
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Dados da empresa</h2>
        <p className="mt-1 text-sm text-slate-500">
          Isso cria seu workspace isolado. Você será o proprietário e poderá convidar a equipe depois.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Nome da empresa *</Label>
        <Input id="name" name="name" required className="h-11 rounded-xl" placeholder="Ex.: Acme Comunicação" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="legalName">Razão social</Label>
          <Input id="legalName" name="legalName" className="h-11 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxId">CNPJ</Label>
          <Input id="taxId" name="taxId" className="h-11 rounded-xl" placeholder="00.000.000/0000-00" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="website">Site</Label>
          <Input id="website" name="website" className="h-11 rounded-xl" placeholder="https://" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone comercial</Label>
          <Input id="phone" name="phone" className="h-11 rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail da empresa</Label>
        <Input id="email" name="email" type="email" className="h-11 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição da atividade</Label>
        <Textarea id="description" name="description" rows={3} className="rounded-xl" />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-xl bg-teal px-5 text-sm font-medium text-white hover:bg-[#0d8a77] disabled:opacity-60"
      >
        {loading ? "Criando…" : "Criar empresa e continuar"}
      </button>
    </form>
  );
}
