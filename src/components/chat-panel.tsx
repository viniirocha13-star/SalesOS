"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Msg = { id: string; direction: "INBOUND" | "OUTBOUND"; body: string };

export function ChatPanel({
  conversationId,
  initialMessages,
  providerHint,
  handoff,
  onTurn,
}: {
  conversationId: string;
  initialMessages: Msg[];
  providerHint: string;
  handoff: boolean;
  onTurn?: () => void;
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
    onTurn?.();
  }

  return (
    <div className="surface flex h-[72vh] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#efe6d9] px-5 py-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-ink/40 uppercase">Simulador</p>
          <p className="font-heading text-xl">WhatsApp</p>
        </div>
        <div className="flex gap-2">
          {handoff && (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-800">IA pausada — handoff</span>
          )}
          <span className="rounded-full bg-[#efe6d9] px-3 py-1 text-xs text-ink/60">
            {provider === "dev_mock_llm" ? "LLM: mock de desenvolvimento" : `LLM: ${provider}`}
          </span>
        </div>
      </div>
      <ScrollArea className="flex-1 p-5">
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={m.direction === "INBOUND" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.direction === "INBOUND"
                    ? "max-w-[80%] rounded-[1.4rem] rounded-br-md bg-terracotta px-4 py-2.5 text-[15px] leading-relaxed text-white"
                    : "max-w-[80%] rounded-[1.4rem] rounded-bl-md bg-[#efe6d9] px-4 py-2.5 text-[15px] leading-relaxed text-ink"
                }
              >
                {m.body}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-ink/40">Consultando ofertas e regras…</div>}
        </div>
      </ScrollArea>
      <div className="flex gap-2 border-t border-[#efe6d9] p-4">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={handoff ? "IA bloqueada nesta conversa" : "Mensagem do cliente..."}
          data-testid="customer-message"
          disabled={handoff}
          className="h-11 rounded-full bg-white"
        />
        <Button onClick={send} disabled={loading || handoff} className="h-11 rounded-full px-5">
          Enviar
        </Button>
      </div>
    </div>
  );
}
