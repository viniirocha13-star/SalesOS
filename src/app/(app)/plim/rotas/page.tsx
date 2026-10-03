import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listRoutes } from "@/lib/repositories/plim/routes";
import { listGroups } from "@/lib/repositories/plim/groups";
import { listBlockedWords } from "@/lib/repositories/plim/blocked-words";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { removeRouteForm, saveRouteForm } from "@/app/(app)/plim/operacao-actions";

export default async function PlimRotasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const [routes, groups, blocked] = await Promise.all([
    listRoutes(ctx.tenantId),
    listGroups(ctx.tenantId),
    listBlockedWords(ctx.tenantId),
  ]);
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Rotas" description="Filtros, duplicidade e palavras bloqueadas (seed global por tenant).">
      <p className="text-xs text-slate-500">Palavras bloqueadas: {blocked.map((b) => b.word).join(", ")}</p>
      <div className={plimCardClass()}>
        <ul className="space-y-2 text-sm">
          {routes.map((r) => (
            <li key={r.id} className="rounded-lg border border-violet-50 p-3">
              <strong>{r.name}</strong> — {r.status}
              <div className="text-xs text-slate-500">Destinos: {r.destinationGroupIds.join(", ") || "—"}</div>
            </li>
          ))}
        </ul>
      </div>
      {canWrite && (
        <form action={saveRouteForm} className={plimCardClass()}>
          <h2 className="font-medium">Nova rota</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input name="name" required placeholder="Nome" className="rounded border px-2 py-1.5" />
            <select name="status" className="rounded border px-2 py-1.5"><option>ATIVA</option><option>PAUSADA</option></select>
            <select name="originGroupId" className="rounded border px-2 py-1.5">
              <option value="">Origem (opcional)</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input name="destinationGroupIds" placeholder="IDs destino (vírgula)" className="rounded border px-2 py-1.5" />
            <input name="marketplaces" placeholder="Marketplaces (vírgula)" className="rounded border px-2 py-1.5" />
            <input name="requiredWords" placeholder="Palavras obrigatórias" className="rounded border px-2 py-1.5" />
            <input name="forbiddenWords" placeholder="Palavras proibidas" className="rounded border px-2 py-1.5" />
            <input name="minDiscount" type="number" placeholder="Desconto mínimo %" className="rounded border px-2 py-1.5" />
            <input name="intervalSec" type="number" placeholder="Intervalo (s)" className="rounded border px-2 py-1.5" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="avoidDuplicates" defaultChecked /> Evitar duplicados</label>
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar rota</button>
        </form>
      )}
      {canWrite && routes[0] && (
        <form action={removeRouteForm} className="text-sm">
          <select name="id">{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <button type="submit" className="ml-2 text-red-600">Excluir</button>
        </form>
      )}
    </PlimSection>
  );
}
