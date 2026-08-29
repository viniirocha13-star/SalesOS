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

  async function submit(result: "APROVADO" | "PENDENCIA" | "REPROVADO") {
    await fetch(`/api/operation/${preSaleId}/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result, quoteNumber, orderNumber, notes }),
    });
    router.push("/operacao");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border bg-white p-4">
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
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => submit("APROVADO")}>
          APROVADO
        </Button>
        <Button variant="outline" onClick={() => submit("PENDENCIA")}>
          PENDÊNCIA
        </Button>
        <Button variant="destructive" onClick={() => submit("REPROVADO")}>
          REPROVADO
        </Button>
      </div>
    </div>
  );
}
