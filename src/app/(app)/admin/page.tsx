import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { UserForm } from "@/components/user-form";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/auth";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export default async function AdminPage() {
  const session = await auth();
  const canUsers = session?.user ? can(session.user.role as Role, "admin.users") : false;
  const [users, audits] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ take: 30, orderBy: { createdAt: "desc" }, include: { actor: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Administração" description="Usuários, integrações e auditoria." />
      <section className="surface p-5">
        <h2 className="font-heading mb-3 text-xl">Módulos</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <a className="underline" href="/admin/diagnostico">Diagnóstico</a>
          <a className="underline" href="/admin/integracoes">Integrações</a>
          <a className="underline" href="/admin/laboratorio">Laboratório IA</a>
          <a className="underline" href="/ofertas#upload-book">Upload do book vigente</a>
        </div>
      </section>
      <section className="surface p-5">
        <h2 className="font-heading mb-3 text-xl">Usuários e RBAC</h2>
        {canUsers ? <UserForm /> : <p className="text-sm text-ink/50">Somente admin cria usuários.</p>}
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="p-2">Nome</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Perfil</th>
              <th className="p-2">Ativo</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.active ? "sim" : "não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="surface p-5">
        <h2 className="font-heading mb-3 text-xl">Auditoria</h2>
        <div className="space-y-1 text-sm">
          {audits.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-1">
              <span>
                {a.actor?.email ?? "sistema"} · {a.action} · {a.entity}
              </span>
              <span className="text-ink/40">{formatDateTime(a.createdAt)}</span>
            </div>
          ))}
          {!audits.length && <p className="text-ink/50">Nenhum evento ainda.</p>}
        </div>
      </section>
    </div>
  );
}
