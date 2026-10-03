import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listAutopilots } from "@/lib/repositories/plim/autopilot";
import { listGroups } from "@/lib/repositories/plim/groups";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { PilotoRunButton } from "@/components/plim/piloto-run-button";
import { removeAutopilotForm, saveAutopilotForm } from "@/app/(app)/plim/operacao-actions";

export default async function PlimPilotoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const pilots = await listAutopilots(ctx.tenantId);
  const groups = await listGroups(ctx.tenantId);
  const destGroups = groups.filter((g) => g.groupRole === "DESTINO");
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Piloto Automático" description="Executa sobre ofertas já capturadas no banco (sem scraping).">
      <div className={plimCardClass()}>
        <ul className="space-y-3 text-sm">
          {pilots.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-50 pb-2">
              <div>
                <strong>{p.name}</strong> — {p.status}
                <div className="text-xs text-slate-500">
                  {p.marketplace ?? "Qualquer marketplace"} · destinos: {p.destinationGroupIds.length || 0}
                </div>
              </div>
              {canWrite && <PilotoRunButton id={p.id} />}
            </li>
          ))}
        </ul>
      </div>
      {canWrite && (
        <form action={saveAutopilotForm} className={plimCardClass()}>
          <h2 className="font-medium">Novo piloto</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input name="name" required className="rounded border px-2 py-1.5" placeholder="Nome" />
            <select name="marketplace" className="rounded border px-2 py-1.5">
              <option value="">Qualquer marketplace</option>
              {["SHOPEE", "MERCADO_LIVRE", "AMAZON", "MAGALU", "ALIEXPRESS", "SHEIN", "AWIN"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input name="searchQuery" className="rounded border px-2 py-1.5" placeholder="Busca (palavras no título)" />
            <input name="minDiscount" type="number" className="rounded border px-2 py-1.5" placeholder="Desconto mín. %" />
            <input name="minPrice" type="number" step="0.01" className="rounded border px-2 py-1.5" placeholder="Preço mín." />
            <input name="maxPrice" type="number" step="0.01" className="rounded border px-2 py-1.5" placeholder="Preço máx." />
            <input name="dailyQuantity" type="number" className="rounded border px-2 py-1.5" placeholder="Qtd máx. ofertas" />
            <select name="destinationGroupIds" multiple className="rounded border px-2 py-1.5 md:col-span-2" size={3}>
              {destGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
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
