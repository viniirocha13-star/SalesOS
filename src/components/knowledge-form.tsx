"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

const TYPES = ["OFERTAS", "FAQ", "REGRAS_COMERCIAIS", "PROCEDIMENTOS", "OBJECOES", "DOCUMENTOS", "POLITICAS"];

export function KnowledgeForm() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("FAQ");
  const [content, setContent] = useState("");
  const router = useRouter();

  return (
    <form
      className="grid gap-2 rounded-xl border bg-white p-4 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, type, content }),
        });
        setTitle("");
        setContent("");
        router.refresh();
      }}
    >
      <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <select className="rounded-md border px-2" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <Textarea className="md:col-span-2" placeholder="Conteúdo aprovado" value={content} onChange={(e) => setContent(e.target.value)} />
      <Button className="bg-orange-500 hover:bg-orange-600">Publicar versão aprovada</Button>
    </form>
  );
}
