import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listQueue } from "@/lib/repositories/plim/queue";
import { getWorkspaceSettings } from "@/lib/repositories/plim/settings";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { queueActionForm } from "@/app/(app)/plim/operacao-actions";

export default async function PlimFilasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const [items, settings] = await Promise.all([listQueue(ctx.tenantId), getWorkspaceSettings(ctx.tenantId)]);
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Filas" description={`Modo teste: ${settings.testMode ? "ATIVO (simula envios)" : "desligado"}`}>
      <div className={plimCardClass()}>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-500"><th>#</th><th>Produto</th><th>Destino</th><th>Status</th><th /></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td>{item.position}</td>
                <td>{item.productName}</td>
                <td>{item.destination ?? item.group?.name ?? "—"}</td>
                <td>{item.status}</td>
                <td className="text-right text-xs">
                  {canWrite && (
                    <div className="flex flex-wrap justify-end gap-1">
                      {(["pause", "resume", "up", "down", "send", "remove"] as const).map((a) => (
                        <form key={a} action={queueActionForm}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="action" value={a} />
                          <button type="submit" className="rounded border px-1.5 py-0.5 capitalize">{a}</button>
                        </form>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.some((i) => i.testPayload) && (
        <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(items.filter((i) => i.testPayload).map((i) => i.testPayload), null, 2)}</pre>
      )}
    </PlimSection>
  );
}
