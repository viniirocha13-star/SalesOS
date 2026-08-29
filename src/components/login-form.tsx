"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>Entrar no Sales OS</h1>
        </CardTitle>
        <CardDescription>Acesso restrito a operadores e gestores comerciais.</CardDescription>
      </CardHeader>
      <CardContent>
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
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue="ursula.b@example.com"
              autoComplete="username"
              aria-label="E-mail"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              defaultValue="Brisa@2026"
              autoComplete="current-password"
              aria-label="Senha"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!ready || loading}
            className="h-9 w-full rounded-lg bg-orange-500 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-xs text-zinc-500">
            Desenvolvimento: ursula.b@example.com — senha Brisa@2026
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
