"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InviteRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
  status: "pending" | "used" | "expired" | "revoked";
};

const STATUS_LABEL: Record<InviteRow["status"], string> = {
  pending: "pendente",
  used: "usado",
  expired: "expirado",
  revoked: "revogado",
};

export function MagicInviteForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("OPERADOR");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  async function load() {
    const res = await fetch("/api/admin/invites");
    if (!res.ok) return;
    const json = await res.json();
    setInvites(json.invites ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError("");
          setUrl("");
          setCopied(false);
          const res = await fetch("/api/admin/invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, role }),
          });
          const json = await res.json();
          setLoading(false);
          if (!res.ok) {
            setError(json.error || "Não foi possível gerar o convite.");
            return;
          }
          setUrl(json.url);
          setEmail("");
          setName("");
          await load();
        }}
      >
        <Input placeholder="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          placeholder="E-mail (opcional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select className="rounded-md border px-2 py-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          <option>ADMIN</option>
          <option>SUPERVISOR</option>
          <option>OPERADOR</option>
          <option>ANALISTA</option>
        </select>
        <Button type="submit" disabled={loading}>
          {loading ? "Gerando..." : "Gerar convite mágico"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {url && (
        <div className="rounded-lg border border-teal/30 bg-teal/5 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal">Convite mágico (copie agora)</p>
          <p className="mb-2 break-all font-mono text-sm" data-testid="invite-url">
            {url}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }}
          >
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <p className="mt-2 text-xs text-ink/50">O link vale 72 horas e só pode ser usado uma vez. Não aparece de novo.</p>
        </div>
      )}
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="p-2">Destino</th>
            <th className="p-2">Perfil</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Expira</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="border-t">
              <td className="p-2">{invite.email || invite.name || "link aberto"}</td>
              <td className="p-2">{invite.role}</td>
              <td className="p-2">{STATUS_LABEL[invite.status]}</td>
              <td className="p-2">{new Date(invite.expiresAt).toLocaleString("pt-BR")}</td>
              <td className="p-2 text-right">
                {invite.status === "pending" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await fetch(`/api/admin/invites/${invite.id}`, { method: "DELETE" });
                      await load();
                    }}
                  >
                    Revogar
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {!invites.length && (
            <tr>
              <td className="p-2 text-ink/50" colSpan={5}>
                Nenhum convite gerado ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
