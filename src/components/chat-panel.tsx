"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Msg = { id: string; direction: "INBOUND" | "OUTBOUND"; body: string };

export function ChatPanel({
  conversationId,
  initialMessages,
  providerHint,
  handoff,
}: {
  conversationId: string;
  initialMessages: Msg[];
  providerHint: string;
  handoff: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(providerHint);

  async function send() {
    if (!text.trim()) return;
    const body = text;
    setText("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), direction: "INBOUND", body }]);
    setLoading(true);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.blocked) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), direction: "OUTBOUND", body: "IA pausada — humano no comando." }]);
      return;
    }
    if (json.reply) {
      setMessages((m) => [...m, { id: crypto.randomUUID(), direction: "OUTBOUND", body: json.reply }]);
    }
    if (json.provider) setProvider(json.provider);
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
        <span>Simulador WhatsApp</span>
        <div className="flex gap-2">
          {handoff && <Badge variant="destructive">IA pausada — handoff</Badge>}
          <Badge variant="secondary">{provider === "dev_mock_llm" ? "LLM: mock de desenvolvimento" : `LLM: ${provider}`}</Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className={m.direction === "INBOUND" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.direction === "INBOUND"
                    ? "max-w-[80%] rounded-2xl bg-orange-500 px-3 py-2 text-sm text-white"
                    : "max-w-[80%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm"
                }
              >
                {m.body}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-zinc-400">IA consultando ofertas/regras...</div>}
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={handoff ? "IA bloqueada nesta conversa" : "Mensagem do cliente..."}
          disabled={handoff}
        />
        <Button onClick={send} disabled={loading || handoff} className="bg-orange-500 hover:bg-orange-600">
          Enviar
        </Button>
      </div>
    </div>
  );
}
