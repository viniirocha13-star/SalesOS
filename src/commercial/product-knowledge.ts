import { prisma } from "@/lib/prisma";
import { fold } from "@/lib/text-norm";

export async function retrieveProductKnowledge(query: string, take = 4) {
  const active = await prisma.offerBook.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  if (!active.length) return [];
  const terms = fold(query).split(/\s+/).filter((t) => t.length > 2).slice(0, 8);
  const docs = await prisma.productKnowledge.findMany({
    where: { approved: true, bookId: { in: active.map((b) => b.id) } },
    take: 80,
  });
  return docs
    .map((doc) => {
      const hay = fold(`${doc.title} ${doc.content} ${doc.queryTerms.join(" ")}`);
      const hits = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { doc, hits };
    })
    .filter((r) => r.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, take)
    .map((r) => ({
      id: r.doc.id,
      title: r.doc.title,
      category: r.doc.category,
      facts: r.doc.facts,
      content: r.doc.content.slice(0, 1200),
    }));
}

export async function exploreBook(query: string) {
  const active = await prisma.offerBook.findFirst({
    where: { status: "ACTIVE" },
    include: { offers: { where: { status: "APROVADA" } } },
  });
  if (!active) return { error: "nenhum_book_ativo", answers: [] as string[], offers: [] as unknown[] };
  const q = fold(query);
  let list = active.offers;
  if (/netflix/.test(q)) list = list.filter((o) => jsonHas(o.includedStreaming, "netflix"));
  else if (/amazon|prime/.test(q)) list = list.filter((o) => jsonHas(o.includedStreaming, "amazon"));
  else if (/globoplay/.test(q)) list = list.filter((o) => jsonHas(o.includedStreaming, "globo"));
  else if (/whatsapp/.test(q)) list = list.filter((o) => o.unlimitedApps.some((a) => fold(a).includes("whatsapp")));
  else if (/700/.test(q) && /mega/.test(q)) list = list.filter((o) => o.speedMbps === 700);
  else if (/fibra/.test(q) && /vigente|oferta/.test(q)) list = list.filter((o) => (o.categoryNormalized ?? "") === "FIBRA");
  else if (/combo/.test(q) || /abaixo/.test(q)) {
    if (/combo/.test(q)) list = list.filter((o) => o.isCombo);
    const budget = q.match(/r?\$?\s*(\d+)/);
    if (budget) {
      const cents = Number(budget[1]) * 100;
      list = list.filter((o) => (o.promotionalPriceCents ?? o.priceCents ?? 0) <= cents);
    }
  } else if (/movel|móvel|chip/.test(q) && /mais internet|mais dados/.test(q)) {
    list = list.filter((o) => (o.categoryNormalized ?? "") === "MOVEL").sort((a, b) => (b.mobileDataGb ?? 0) - (a.mobileDataGb ?? 0));
  } else if (/fwa/.test(q)) list = list.filter((o) => (o.categoryNormalized ?? "") === "FWA");
  else if (/instal/.test(q)) list = list.filter((o) => o.installationIncluded);
  const answers = list.slice(0, 12).map((o) => {
    const price = o.promotionalPriceCents ?? o.priceCents;
    const priceTxt = price != null ? `R$ ${(price / 100).toFixed(2).replace(".", ",")}` : "sem preço";
    return `${o.name} · ${o.city ?? "—"} · ${priceTxt} · ${o.categoryNormalized ?? o.category ?? ""}`;
  });
  return {
    book: { id: active.id, name: active.originalName, status: active.status },
    answers,
    offers: list.slice(0, 12).map((o) => ({
      id: o.id,
      name: o.name,
      city: o.city,
      category: o.categoryNormalized,
      priceCents: o.promotionalPriceCents ?? o.priceCents,
      streaming: o.includedStreaming,
      apps: o.unlimitedApps,
      sourceSheet: o.sourceSheet,
      sourceRow: o.sourceRow,
    })),
  };
}

function jsonHas(value: unknown, term: string) {
  return fold(JSON.stringify(value ?? "")).includes(term);
}
