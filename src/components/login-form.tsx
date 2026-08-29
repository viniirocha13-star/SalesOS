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
      <p className="mb-2 text-[11px] tracking-[0.22em] text-terracotta uppercase lg:hidden">Brisanet</p>
      <h1 className="font-heading text-4xl text-ink">Entrar no Sales OS</h1>
      <p className="mt-2 mb-8 text-[15px] text-ink/55">Acesso restrito a operadores e gestores comerciais.</p>
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
            className="h-12 rounded-2xl bg-cream"
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
            className="h-12 rounded-2xl bg-cream"
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
          className="h-12 w-full rounded-full bg-terracotta text-[15px] font-medium text-white transition-colors hover:bg-[#a84c1d] disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <p className="text-xs text-ink/40">Desenvolvimento: ursula.b@example.com — senha Brisa@2026</p>
      </form>
    </div>
  );
}
