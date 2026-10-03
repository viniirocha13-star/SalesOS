import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listSchedules } from "@/lib/repositories/plim/schedules";
import { listOffers } from "@/lib/repositories/plim/offers";
import { listGroups } from "@/lib/repositories/plim/groups";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { cancelScheduleForm, createScheduleAction } from "@/app/(app)/plim/operacao-actions";

export default async function PlimAgendamentosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const [schedules, offers, groups] = await Promise.all([
    listSchedules(ctx.tenantId),
    listOffers(ctx.tenantId),
    listGroups(ctx.tenantId),
  ]);
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Agendamentos" description="Cron materializa itens na fila quando vencidos.">
      <div className={plimCardClass()}>
        <ul className="text-sm space-y-2">
          {schedules.map((s) => (
            <li key={s.id} className="flex justify-between border-b border-violet-50 pb-2">
              <span>{s.offer.productName} — {s.scheduledAt.toLocaleString("pt-BR")} ({s.status})</span>
              {canWrite && s.status === "PENDENTE" && (
                <form action={cancelScheduleForm}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-red-600 text-xs">Cancelar</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>
      {canWrite && (
        <form action={createScheduleAction} className={plimCardClass()}>
          <h2 className="font-medium">Novo agendamento</h2>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <select name="offerId" required className="rounded border px-2 py-1.5">
              {offers.map((o) => <option key={o.id} value={o.id}>{o.productName}</option>)}
            </select>
            <input name="scheduledAt" type="datetime-local" required className="rounded border px-2 py-1.5" />
            <select name="repeat" className="rounded border px-2 py-1.5">
              <option value="NENHUMA">Sem repetição</option>
              <option value="DIARIA">Diária</option>
              <option value="SEMANAL">Semanal</option>
            </select>
            <select name="destinationGroupIds" multiple className="rounded border px-2 py-1.5 md:col-span-2">
              {groups.filter((g) => g.groupRole === "DESTINO").map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Agendar</button>
        </form>
      )}
    </PlimSection>
  );
}
