"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const destRaw = params.get("from") || params.get("callbackUrl") || "/dashboard";
  const dest =
    destRaw.startsWith("/") && !destRaw.startsWith("//") && destRaw !== "/login" ? destRaw : "/dashboard";

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div className="w-full max-w-md">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-teal uppercase lg:hidden">Sales OS</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Entrar no Sales OS</h1>
      <p className="mt-2 mb-8 text-[15px] text-slate-500">Acesso restrito a operadores e gestores comerciais.</p>
      <form
        method="post"
        action="/login"
        data-testid={ready ? "login-ready" : "login-pending"}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!ready) return;
          setLoading(true);
          setError("");
          const form = new FormData(event.currentTarget);
          const result = await signIn("credentials", {
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            redirect: false,
            callbackUrl: dest,
          });
          if (result?.error) {
            setLoading(false);
            setError("E-mail ou senha inválidos.");
            return;
          }
          window.location.assign(dest);
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-ink/70">
            E-mail
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue="ursula.b@example.com"
            autoComplete="username"
            aria-label="E-mail"
            className="h-12 rounded-xl bg-slate-50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-ink/70">
            Senha
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            defaultValue="Brisa@2026"
            autoComplete="current-password"
            aria-label="Senha"
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
          disabled={!ready || loading}
          className="h-12 w-full rounded-xl bg-teal text-[15px] font-medium text-white transition-colors hover:bg-[#0d8a77] disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-xs text-ink/40">Desenvolvimento: ursula.b@example.com — senha Brisa@2026</p>
      </form>
    </div>
  );
}
