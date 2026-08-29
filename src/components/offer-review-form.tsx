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

  async function save(status: "APROVADA" | "REJEITADA" | "AGUARDANDO_APROVACAO") {
    await fetch(`/api/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status }),
    });
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
        <Button onClick={() => save("APROVADA")} className="bg-emerald-600 hover:bg-emerald-700">
          Aprovar
        </Button>
        <Button variant="outline" onClick={() => save("AGUARDANDO_APROVACAO")}>
          Salvar edição
        </Button>
        <Button variant="destructive" onClick={() => save("REJEITADA")}>
          Rejeitar
        </Button>
      </div>
    </div>
  );
}
