import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { UserForm } from "@/components/user-form";

export default async function AdminPage() {
  const [users, audits] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.auditLog.findMany({ take: 30, orderBy: { createdAt: "desc" }, include: { actor: true } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Administração</h1>
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-medium">Usuários e RBAC</h2>
        <UserForm />
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
      <section className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-medium">Auditoria</h2>
        <div className="space-y-1 text-sm">
          {audits.map((a) => (
            <div key={a.id} className="flex justify-between border-b py-1">
              <span>
                {a.actor?.email ?? "sistema"} · {a.action} · {a.entity}
              </span>
              <span className="text-zinc-500">{formatDateTime(a.createdAt)}</span>
            </div>
          ))}
          {!audits.length && <p className="text-zinc-500">Nenhum evento ainda.</p>}
        </div>
      </section>
    </div>
  );
}
