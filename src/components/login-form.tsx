"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "@/app/login/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar no Sales OS</CardTitle>
        <CardDescription>Acesso restrito a operadores e gestores comerciais.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={async (formData) => {
            setLoading(true);
            setError("");
            const message = await authenticate(formData);
            setLoading(false);
            if (message) setError(message);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="from" value={params.get("from") || "/dashboard"} />
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" defaultValue="ursula.b@example.com" autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" defaultValue="Brisa@2026" autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
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
