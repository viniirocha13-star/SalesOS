import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listPlimAuditLogs, listPlimErrorLogs } from "@/lib/repositories/plim/analytics";
import { HistoricoErrorsTable } from "@/components/plim/historico-errors";

export default async function PlimHistoricoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const [audit, errors] = await Promise.all([
    listPlimAuditLogs(150),
    listPlimErrorLogs(ctx.tenantId),
  ]);

  const plimAudit = audit.filter(
    (a) => a.action.startsWith("plim.") || a.entity.startsWith("Plim"),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Histórico</h1>
        <p className="text-sm text-slate-500">AuditLog do workspace e erros operacionais PLIM.</p>
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase text-slate-500">Auditoria PLIM</h2>
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Ação</th>
                <th className="px-3 py-2">Entidade</th>
                <th className="px-3 py-2">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {plimAudit.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(a.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2">{a.action}</td>
                  <td className="px-3 py-2">{a.entity}{a.entityId ? ` #${a.entityId.slice(0, 8)}` : ""}</td>
                  <td className="px-3 py-2">{a.actor?.name ?? a.actor?.email ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!plimAudit.length && <p className="p-4 text-slate-500">Nenhuma ação PLIM registrada ainda.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase text-red-700">Erros pendentes</h2>
        <HistoricoErrorsTable
          canRetry={canPlimWrite(ctx.profile)}
          rows={errors.map((e) => ({
            ...e,
            payload: e.payload,
          }))}
        />
      </section>
    </div>
  );
}
