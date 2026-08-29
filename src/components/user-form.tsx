"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function UserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("OPERADOR");
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role, password: "Brisa@2026" }),
        });
        router.refresh();
      }}
    >
      <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <select className="rounded-md border px-2" value={role} onChange={(e) => setRole(e.target.value)}>
        <option>ADMIN</option>
        <option>SUPERVISOR</option>
        <option>OPERADOR</option>
        <option>ANALISTA</option>
      </select>
      <Button>Criar usuário</Button>
    </form>
  );
}
