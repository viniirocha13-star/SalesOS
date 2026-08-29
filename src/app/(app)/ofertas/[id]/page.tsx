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
        <h1 className="text-xl font-semibold">Oferta detectada pela IA</h1>
        <OfferBadge status={offer.status} />
        <h2 className="text-sm font-medium">Texto original</h2>
        <pre className="max-h-80 overflow-auto rounded bg-zinc-50 p-3 text-xs whitespace-pre-wrap">{offer.originalText}</pre>
        <p className="text-xs text-zinc-500">Fonte: {offer.book?.originalName ?? offer.source}</p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Informações estruturadas</h2>
        <p className="mb-3 text-sm text-zinc-500">Preço vigente: {formatBRL(offer.promotionalPriceCents ?? offer.priceCents)}</p>
        <OfferReviewForm offer={offer} />
      </div>
    </div>
  );
}
