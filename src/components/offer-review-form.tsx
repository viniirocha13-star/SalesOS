"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Offer } from "@prisma/client";

export function OfferReviewForm({ offer }: { offer: Offer }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: offer.name,
    city: offer.city ?? "",
    speedMbps: offer.speedMbps?.toString() ?? "",
    priceCents: offer.priceCents?.toString() ?? "",
    promotionalPriceCents: offer.promotionalPriceCents?.toString() ?? "",
    benefits: offer.benefits.join(", "),
    rules: offer.rules ?? "",
    restrictions: offer.restrictions ?? "",
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function save(status: "APROVADA" | "REJEITADA" | "AGUARDANDO_APROVACAO" | "EXPIRADA") {
    setBusy(status);
    setError("");
    const res = await fetch(`/api/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status }),
    });
    setBusy(null);
    if (!res.ok) {
      setError("Não foi possível gravar a oferta. Verifique a sessão e tente de novo.");
      return;
    }
    router.refresh();
    router.push("/ofertas");
  }

  return (
    <div className="space-y-3">
      {(
        [
          ["name", "Nome"],
          ["city", "Cidade"],
          ["speedMbps", "Velocidade Mbps"],
          ["priceCents", "Preço (centavos)"],
          ["promotionalPriceCents", "Preço promocional (centavos)"],
        ] as const
      ).map(([key, label]) => (
        <div key={key} className="space-y-1">
          <Label>{label}</Label>
          <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </div>
      ))}
      <div className="space-y-1">
        <Label>Benefícios</Label>
        <Input value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Regras</Label>
        <Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!!busy} onClick={() => save("APROVADA")} className="bg-emerald-600 hover:bg-emerald-700">
          {busy === "APROVADA" ? "Aprovando..." : "Aprovar"}
        </Button>
        <Button disabled={!!busy} variant="outline" onClick={() => save("AGUARDANDO_APROVACAO")}>
          {busy === "AGUARDANDO_APROVACAO" ? "Salvando..." : "Salvar edição"}
        </Button>
        <Button disabled={!!busy} variant="destructive" onClick={() => save("EXPIRADA")}>
          {busy === "EXPIRADA" ? "Retirando..." : "Retirar da IA"}
        </Button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      </div>
    </div>
  );
}
