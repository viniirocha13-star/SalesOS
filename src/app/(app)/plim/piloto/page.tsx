import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listAutopilots } from "@/lib/repositories/plim/autopilot";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { PilotoRunButton } from "@/components/plim/piloto-run-button";
import { removeAutopilotForm, saveAutopilotForm } from "@/app/(app)/plim/operacao-actions";

export default async function PlimPilotoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const pilots = await listAutopilots(ctx.tenantId);
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Piloto Automático" description="CRUD do piloto; busca automática só com fonte configurada.">
      <div className={plimCardClass()}>
        <ul className="space-y-3 text-sm">
          {pilots.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-50 pb-2">
              <div>
                <strong>{p.name}</strong> — {p.status}
                <div className="text-xs text-slate-500">Fonte: {p.sourceKey || "não configurada"}</div>
              </div>
              {canWrite && <PilotoRunButton id={p.id} hasSource={Boolean(p.sourceKey?.trim())} />}
            </li>
          ))}
        </ul>
      </div>
      {canWrite && (
        <form action={saveAutopilotForm} className={plimCardClass()}>
          <h2 className="font-medium">Novo piloto</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input name="name" required className="rounded border px-2 py-1.5" placeholder="Nome" />
            <input name="searchQuery" className="rounded border px-2 py-1.5" placeholder="Busca" />
            <input name="sourceKey" className="rounded border px-2 py-1.5" placeholder="Chave da fonte (env/config)" />
            <input name="dailyQuantity" type="number" className="rounded border px-2 py-1.5" placeholder="Qtd diária" />
            <input name="destinationGroupIds" className="rounded border px-2 py-1.5" placeholder="Grupos destino (ids)" />
            <select name="status" className="rounded border px-2 py-1.5"><option>ATIVO</option><option>PAUSADO</option></select>
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar</button>
        </form>
      )}
      {canWrite && pilots[0] && (
        <form action={removeAutopilotForm} className="text-sm">
          <select name="id">{pilots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="ml-2 text-red-600">Excluir</button>
        </form>
      )}
    </PlimSection>
  );
}
