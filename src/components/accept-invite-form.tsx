"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteAction } from "@/app/convite/actions";

export function AcceptInviteForm({
  token,
  lockedEmail,
  suggestedName,
  role,
}: {
  token: string;
  lockedEmail: string | null;
  suggestedName: string | null;
  role: string;
}) {
  const [error, action, pending] = useActionState(acceptInviteAction, "");

  return (
    <div className="w-full max-w-md">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-teal uppercase">Sales OS</p>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Convite mágico</h1>
      <p className="mt-2 mb-8 text-[15px] text-slate-500">
        Crie sua senha para entrar como {role.toLowerCase()}.
      </p>
      <form action={action} method="post" className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required defaultValue={suggestedName ?? ""} className="h-12 rounded-xl bg-slate-50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={lockedEmail ?? ""}
            readOnly={Boolean(lockedEmail)}
            className="h-12 rounded-xl bg-slate-50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="h-12 rounded-xl bg-slate-50"
          />
          <p className="text-xs text-ink/40">Mínimo de 10 caracteres, sem espaços.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-12 w-full rounded-xl bg-teal text-[15px] font-medium text-white transition-colors hover:bg-[#0d8a77] disabled:opacity-60"
        >
          {pending ? "Criando acesso..." : "Ativar acesso"}
        </button>
      </form>
    </div>
  );
}
