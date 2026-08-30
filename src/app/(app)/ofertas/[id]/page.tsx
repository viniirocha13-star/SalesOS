import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OfferBadge } from "@/components/status-badge";
import { formatBRL } from "@/lib/format";
import { OfferReviewForm } from "@/components/offer-review-form";

export default async function OfferReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await prisma.offer.findUnique({ where: { id }, include: { book: true } });
  if (!offer) notFound();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-white p-4">
        <h1 className="text-xl font-semibold" data-testid="heading-offer">
          {offer.name}
        </h1>
        <p className="text-sm text-zinc-500">Oferta extraída do book — revise antes de aprovar para o motor.</p>
        <OfferBadge status={offer.status} />
        <h2 className="text-sm font-medium">Texto original da linha</h2>
        <pre className="max-h-80 overflow-auto rounded bg-zinc-50 p-3 text-xs whitespace-pre-wrap">{offer.originalText}</pre>
        <p className="text-xs text-zinc-500">
          Fonte interna: {offer.book?.originalName ?? offer.source} · {offer.sourceSheet} #{offer.sourceRow}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-500">Aquisição</dt>
          <dd>{offer.acquisitionType ?? "—"}</dd>
          <dt className="text-zinc-500">Canal</dt>
          <dd>{offer.salesChannelRaw ?? "—"}</dd>
          <dt className="text-zinc-500">Nível</dt>
          <dd>{offer.offerLevel ?? "—"}</dd>
          <dt className="text-zinc-500">Combo</dt>
          <dd>{offer.isCombo ? "sim" : "não"}</dd>
          <dt className="text-zinc-500">Streaming</dt>
          <dd>{JSON.stringify(offer.includedStreaming ?? [])}</dd>
          <dt className="text-zinc-500">Apps</dt>
          <dd>{offer.unlimitedApps.join(", ") || "—"}</dd>
        </dl>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Informações estruturadas</h2>
        <p className="mb-3 text-sm text-zinc-500">Preço vigente: {formatBRL(offer.promotionalPriceCents ?? offer.priceCents)}</p>
        <OfferReviewForm offer={offer} />
      </div>
    </div>
  );
}
