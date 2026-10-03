import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { listClickEvents } from "@/lib/repositories/plim/analytics";

export default async function PlimCliquesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const rows = await listClickEvents(ctx.tenantId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-violet-950">Cliques</h1>
        <p className="text-sm text-slate-500">Eventos gravados em PlimClickEvent com UTMs e destino.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-violet-100 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-violet-50 text-xs uppercase text-violet-800">
            <tr>
              <th className="px-3 py-2">Data/hora</th>
              <th className="px-3 py-2">Oferta</th>
              <th className="px-3 py-2">Grupo</th>
              <th className="px-3 py-2">Campanha</th>
              <th className="px-3 py-2">Marketplace</th>
              <th className="px-3 py-2">Destino</th>
              <th className="px-3 py-2">UTMs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dest =
                r.destination ??
                r.offer?.shortLink ??
                r.offer?.affiliateLink ??
                "—";
              const utms = [r.utmSource, r.utmMedium, r.utmCampaign, r.utmContent, r.utmTerm]
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.clickedAt).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2">{r.offer?.productName ?? "—"}</td>
                  <td className="px-3 py-2">{r.group?.name ?? "—"}</td>
                  <td className="px-3 py-2">{r.campaign ?? r.utmCampaign ?? "—"}</td>
                  <td className="px-3 py-2">{r.marketplace?.replace(/_/g, " ") ?? "—"}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2" title={dest}>{dest}</td>
                  <td className="max-w-[12rem] truncate px-3 py-2 text-xs text-slate-600" title={utms || undefined}>
                    {utms || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className="p-4 text-sm text-slate-500">Nenhum clique registrado.</p>}
      </div>
    </div>
  );
}
