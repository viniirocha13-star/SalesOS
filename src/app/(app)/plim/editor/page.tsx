import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getPlimContext } from "@/lib/plim/tenant-context";
import { canPlimWrite } from "@/lib/plim/profile";
import { listOffers, getOffer } from "@/lib/repositories/plim/offers";
import { listGroups } from "@/lib/repositories/plim/groups";
import { ensureDefaultTemplate, listTemplates } from "@/lib/repositories/plim/templates";
import { PlimSection, plimCardClass } from "@/components/plim/plim-section";
import { formatBrPrice, renderMessageTemplate } from "@/lib/plim/template-render";
import { saveEditorOffer, saveMessageTemplate } from "@/app/(app)/plim/operacao-actions";
import { EditorWorkflow } from "@/components/plim/editor-workflow";

export default async function PlimEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ offer?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ctx = await getPlimContext(session.user.id, session.user.role as Role);
  const sp = await searchParams;
  const offers = await listOffers(ctx.tenantId);
  const offer = sp.offer ? await getOffer(ctx.tenantId, sp.offer) : offers[0];
  const [groups, template, templates] = await Promise.all([
    listGroups(ctx.tenantId),
    ensureDefaultTemplate(ctx.tenantId),
    listTemplates(ctx.tenantId),
  ]);
  const canWrite = canPlimWrite(ctx.profile);

  if (!offer) {
    return (
      <PlimSection title="Editor de Ofertas" description="Nenhuma oferta disponível.">
        <p className="text-sm text-slate-500">Cadastre ofertas em /plim/ofertas.</p>
      </PlimSection>
    );
  }

  const previewMessage = renderMessageTemplate(template.body, {
    produto: `${offer.messageEmoji ?? "🔥"} ${offer.productName}`,
    preco_anterior: formatBrPrice(offer.originalPrice ? Number(offer.originalPrice) : null),
    preco: formatBrPrice(offer.currentPrice ? Number(offer.currentPrice) : null),
    cupom: offer.coupon ? `Cupom: ${offer.coupon}` : "",
    link: offer.shortLink ?? offer.affiliateLink ?? offer.originalLink ?? "",
  });

  return (
    <PlimSection title="Editor de Ofertas" description="Prévia, templates e publicação real (ou simulada em modo teste).">
      <div className="flex flex-wrap gap-2 text-sm">
        {offers.slice(0, 12).map((o) => (
          <a key={o.id} href={`/plim/editor?offer=${o.id}`} className={`rounded-full px-3 py-1 ${o.id === offer.id ? "bg-violet-600 text-white" : "bg-white ring-1 ring-violet-100"}`}>{o.productName.slice(0, 24)}</a>
        ))}
      </div>
      {canWrite && (
        <form action={saveEditorOffer} className={plimCardClass()}>
          <input type="hidden" name="id" value={offer.id} />
          <div className="grid gap-2 md:grid-cols-2">
            <input name="messageEmoji" defaultValue={offer.messageEmoji ?? "🔥"} className="rounded border px-2 py-1.5" placeholder="Emoji" />
            <input name="productName" defaultValue={offer.productName} required className="rounded border px-2 py-1.5" />
            <textarea name="description" defaultValue={offer.description ?? ""} className="md:col-span-2 rounded border p-2" rows={3} />
            <input name="originalPrice" type="number" step="0.01" defaultValue={offer.originalPrice ? Number(offer.originalPrice) : ""} />
            <input name="currentPrice" type="number" step="0.01" defaultValue={offer.currentPrice ? Number(offer.currentPrice) : ""} />
            <input name="coupon" defaultValue={offer.coupon ?? ""} />
            <input name="ctaLabel" defaultValue={offer.ctaLabel ?? "Comprar"} />
            <input name="imageUrl" defaultValue={offer.imageUrl ?? ""} className="md:col-span-2" placeholder="URL da imagem" />
            <input name="affiliateLink" defaultValue={offer.affiliateLink ?? ""} className="md:col-span-2" />
            <select name="status" defaultValue={offer.status} className="rounded border px-2 py-1.5">
              {["NOVA", "APROVADA", "PROGRAMADA", "PUBLICADA"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">Salvar rascunho</button>
        </form>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={plimCardClass()}>
          <h2 className="font-medium">Prévia</h2>
          {offer.imageUrl && <img src={offer.imageUrl} alt="" className="mt-2 max-h-48 rounded-lg object-contain" />}
          <pre className="mt-3 whitespace-pre-wrap text-sm">{previewMessage}</pre>
          <p className="mt-2 text-xs text-slate-500">Destino: {offer.affiliateLink ?? offer.originalLink ?? "—"}</p>
        </div>
        <div className={plimCardClass()}>
          <h2 className="font-medium">Ações</h2>
          {canWrite && <EditorWorkflow offerId={offer.id} groups={groups.filter((g) => g.groupRole === "DESTINO").map((g) => ({ id: g.id, name: g.name }))} />}
        </div>
      </div>
      {canWrite && (
        <form action={saveMessageTemplate} className={plimCardClass()}>
          <h2 className="font-medium">Template de mensagem</h2>
          <select name="id" className="mt-2 w-full rounded border px-2 py-1.5">
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input name="name" defaultValue={template.name} className="mt-2 w-full rounded border px-2 py-1.5" />
          <textarea name="body" defaultValue={template.body} rows={5} className="mt-2 w-full rounded border p-2 font-mono text-sm" />
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={template.isDefault} /> Padrão</label>
          <button type="submit" className="mt-3 rounded-lg border px-4 py-2 text-sm">Salvar template</button>
        </form>
      )}
    </PlimSection>
  );
}
