import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listOffers } from "@/lib/repositories/plim/offers";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import {
  importOfferFromLinkForm,
  importOfferFromPasteForm,
  importOffersFromCsvForm,
  removeOfferForm,
  saveOfferForm,
} from "@/app/(app)/plim/operacao-actions";

export default async function PlimOfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const sp = await searchParams;
  const offers = await listOffers(ctx.tenantId, {
    q: sp.q,
    status: sp.status as import("@prisma/client").PlimOfferStatus | undefined,
  });
  const canWrite = canPlimWrite(ctx.profile);

  return (
    <PlimSection title="Ofertas" description="Central de captura, filtro e edição persistida no banco.">
      <form className="flex flex-wrap gap-2" method="get">
        <input name="q" placeholder="Buscar produto" defaultValue={sp.q} className="rounded-lg border px-3 py-2 text-sm" />
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border px-3 py-2 text-sm">
          <option value="">Todos status</option>
          {["NOVA", "EM_ANALISE", "APROVADA", "PUBLICADA", "IGNORADA", "ERRO"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white">Filtrar</button>
      </form>

      {canWrite && (
        <div className="grid gap-4 lg:grid-cols-3">
          <form action={importOfferFromPasteForm} className={plimCardClass()}>
            <h2 className="font-medium text-violet-900">Colar texto</h2>
            <textarea name="text" rows={5} className="mt-2 w-full rounded border p-2 text-sm" required />
            <button type="submit" className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white">Importar</button>
          </form>
          <form action={importOfferFromLinkForm} className={plimCardClass()}>
            <h2 className="font-medium text-violet-900">Link</h2>
            <input name="link" type="url" className="mt-2 w-full rounded border px-2 py-1.5 text-sm" required />
            <button type="submit" className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white">Importar</button>
          </form>
          <form action={importOffersFromCsvForm} className={plimCardClass()}>
            <h2 className="font-medium text-violet-900">CSV</h2>
            <textarea name="csv" rows={5} placeholder="produto,link,preco" className="mt-2 w-full rounded border p-2 text-sm" />
            <button type="submit" className="mt-2 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white">Importar CSV</button>
          </form>
        </div>
      )}

      <div className={plimCardClass()}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="py-2">Produto</th>
              <th>Marketplace</th>
              <th>Status</th>
              <th>Preço</th>
              {canWrite && <th />}
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t border-violet-50">
                <td className="py-2 font-medium">{o.productName}</td>
                <td>{o.marketplace}</td>
                <td>{o.status}</td>
                <td>{o.currentPrice ? `R$ ${o.currentPrice}` : "—"}</td>
                {canWrite && (
                  <td className="text-right">
                    <a href={`/plim/editor?offer=${o.id}`} className="text-violet-600">Editar</a>
                    <form action={removeOfferForm} className="inline ml-2">
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="text-red-600">Excluir</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <form action={saveOfferForm} className={plimCardClass()}>
          <h2 className="font-medium">Nova oferta manual</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <input name="productName" placeholder="Produto" required className="rounded border px-2 py-1.5" />
            <select name="marketplace" className="rounded border px-2 py-1.5">
              {["SHOPEE", "MERCADO_LIVRE", "AMAZON", "MAGALU", "ALIEXPRESS", "SHEIN", "AWIN", "OUTRO"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input name="originalLink" placeholder="Link original" className="rounded border px-2 py-1.5 md:col-span-2" />
            <input name="currentPrice" placeholder="Preço" type="number" step="0.01" className="rounded border px-2 py-1.5" />
            <input name="coupon" placeholder="Cupom" className="rounded border px-2 py-1.5" />
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar</button>
        </form>
      )}
    </PlimSection>
  );
}
