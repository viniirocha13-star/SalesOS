"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LaunchForm({ preSaleId }: { preSaleId: string }) {
  const router = useRouter();
  const [quoteNumber, setQuote] = useState("");
  const [orderNumber, setOrder] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function submit(result: "APROVADO" | "PENDENCIA" | "REPROVADO") {
    setBusy(result);
    setError("");
    const res = await fetch(`/api/operation/${preSaleId}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, quoteNumber, orderNumber, notes }),
    });
    setBusy(null);
    if (!res.ok) {
      setError("Não foi possível atualizar o lançamento.");
      return;
    }
    router.push("/operacao");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
      <p className="text-sm font-medium">Lançar no sistema o que o cliente enviou</p>
      <div className="space-y-1">
        <Label>Número do orçamento</Label>
        <Input value={quoteNumber} onChange={(e) => setQuote(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Número do pedido</Label>
        <Input value={orderNumber} onChange={(e) => setOrder(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Observação / pendência / motivo</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="A IA usará exatamente este texto em PENDÊNCIA ou REPROVADO." />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!!busy} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => submit("APROVADO")}>
          {busy === "APROVADO" ? "Registrando..." : "APROVADO"}
        </Button>
        <Button disabled={!!busy} variant="outline" onClick={() => submit("PENDENCIA")}>
          {busy === "PENDENCIA" ? "Registrando..." : "PENDÊNCIA"}
        </Button>
        <Button disabled={!!busy} variant="destructive" onClick={() => submit("REPROVADO")}>
          {busy === "REPROVADO" ? "Registrando..." : "REPROVADO"}
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
