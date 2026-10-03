"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-md">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-[#148a52] uppercase">ZapTurbo</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Criar sua conta</h1>
      <p className="mt-2 mb-8 text-[15px] text-slate-500">
        Passo 1 de 10 — em seguida você cria a empresa e conecta a Meta, sem Postman ou painéis técnicos.
      </p>
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError("");
          const form = new FormData(event.currentTarget);
          const payload = {
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
          };
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setLoading(false);
            setError(data.error ?? "Não foi possível criar a conta.");
            return;
          }
          const loginResult = await signIn("credentials", {
            email: payload.email,
            password: payload.password,
            redirect: false,
            callbackUrl: "/onboarding",
          });
          if (loginResult?.error) {
            setLoading(false);
            setError("Conta criada. Faça login para continuar.");
            router.push("/login?from=/onboarding");
            return;
          }
          router.push("/onboarding");
          router.refresh();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input id="name" name="name" required autoComplete="name" className="h-12 rounded-xl bg-slate-50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail de trabalho</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" className="h-12 rounded-xl bg-slate-50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-12 rounded-xl bg-slate-50"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-[#1fad6c] text-[15px] font-medium text-white hover:bg-[#18965c] disabled:opacity-60"
        >
          {loading ? "Criando conta…" : "Criar conta e continuar"}
        </button>
        <p className="text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login?from=/onboarding" className="font-medium text-[#148a52] hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
