import type { PlimBlockedWord, PlimOffer, PlimRoute } from "@prisma/client";

export type RouteEvaluation = {
  status: "APROVADA" | "EM_ANALISE" | "IGNORADA";
  reason?: string;
};

export function evaluateOfferAgainstRoute(
  offer: Pick<
    PlimOffer,
    "productName" | "description" | "marketplace" | "category" | "currentPrice" | "discountPercent"
  >,
  route: PlimRoute,
  blockedWords: PlimBlockedWord[],
): RouteEvaluation {
  const text = `${offer.productName} ${offer.description ?? ""}`.toLowerCase();

  for (const w of blockedWords) {
    if (!w.active) continue;
    if (text.includes(w.word.toLowerCase())) {
      return { status: "IGNORADA", reason: `Palavra bloqueada: ${w.word}` };
    }
  }

  for (const w of route.forbiddenWords) {
    if (w && text.includes(w.toLowerCase())) {
      return { status: "IGNORADA", reason: `Palavra proibida na rota: ${w}` };
    }
  }

  if (route.requiredWords.length > 0) {
    const ok = route.requiredWords.some((w) => w && text.includes(w.toLowerCase()));
    if (!ok) return { status: "EM_ANALISE", reason: "Palavras obrigatórias ausentes" };
  }

  if (route.marketplaces.length > 0 && !route.marketplaces.includes(offer.marketplace)) {
    return { status: "IGNORADA", reason: "Marketplace fora da rota" };
  }

  if (route.categories.length > 0 && offer.category) {
    if (!route.categories.some((c) => c.toLowerCase() === offer.category!.toLowerCase())) {
      return { status: "IGNORADA", reason: "Categoria fora da rota" };
    }
  }

  const price = offer.currentPrice ? Number(offer.currentPrice) : null;
  if (route.minPrice != null && price != null && price < Number(route.minPrice)) {
    return { status: "IGNORADA", reason: "Preço abaixo do mínimo" };
  }
  if (route.maxPrice != null && price != null && price > Number(route.maxPrice)) {
    return { status: "IGNORADA", reason: "Preço acima do máximo" };
  }
  if (route.minDiscount != null && (offer.discountPercent ?? 0) < route.minDiscount) {
    return { status: "IGNORADA", reason: "Desconto insuficiente" };
  }

  return { status: "APROVADA" };
}
