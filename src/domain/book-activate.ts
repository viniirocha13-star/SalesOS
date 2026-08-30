import { prisma } from "@/lib/prisma";
import { fold } from "@/lib/text-norm";

export async function activateOfferBook(bookId: string) {
  const book = await prisma.offerBook.findUnique({ where: { id: bookId }, include: { offers: true } });
  if (!book) throw Object.assign(new Error("book_nao_encontrado"), { status: 404 });

  await prisma.$transaction(async (tx) => {
    const previous = await tx.offerBook.findMany({ where: { status: "ACTIVE", id: { not: bookId } } });
    for (const old of previous) {
      await tx.offer.updateMany({ where: { bookId: old.id }, data: { status: "EXPIRADA" } });
      await tx.offerBook.update({ where: { id: old.id }, data: { status: "EXPIRED" } });
    }
    await tx.offer.updateMany({
      where: { bookId, status: "AGUARDANDO_APROVACAO" },
      data: { status: "APROVADA" },
    });
    await tx.offerBook.update({
      where: { id: bookId },
      data: { status: "ACTIVE", activatedAt: new Date() },
    });
    await tx.productKnowledge.deleteMany({ where: { bookId } });
  });

  await materializeProductKnowledge(bookId);
  return prisma.offerBook.findUniqueOrThrow({
    where: { id: bookId },
    include: { _count: { select: { offers: true, knowledge: true } } },
  });
}

export async function materializeProductKnowledge(bookId: string) {
  const offers = await prisma.offer.findMany({ where: { bookId, status: "APROVADA" } });
  const docs: { title: string; category: string | null; queryTerms: string[]; facts: object; content: string }[] = [];

  const byCat = group(offers, (o) => o.categoryNormalized ?? o.category ?? "OUTROS");
  for (const [category, list] of Object.entries(byCat)) {
    docs.push({
      title: `Planos ${category} vigentes`,
      category,
      queryTerms: [category.toLowerCase(), "plano", "oferta"],
      facts: { offerIds: list.map((o) => o.id), count: list.length },
      content: list.map((o) => customerLine(o)).join("\n"),
    });
  }

  for (const provider of unique(offers.flatMap((o) => streamingProviders(o)))) {
    const list = offers.filter((o) => streamingProviders(o).includes(provider));
    docs.push({
      title: `Ofertas com ${provider}`,
      category: null,
      queryTerms: [fold(provider), "streaming", provider.toLowerCase()],
      facts: { provider, offerIds: list.map((o) => o.id) },
      content: list.map((o) => customerLine(o)).join("\n"),
    });
  }

  for (const app of unique(offers.flatMap((o) => o.unlimitedApps))) {
    const list = offers.filter((o) => o.unlimitedApps.includes(app));
    docs.push({
      title: `Ofertas com ${app} ilimitado`,
      category: "MOVEL",
      queryTerms: [fold(app), "ilimitado", "apps"],
      facts: { app, offerIds: list.map((o) => o.id), claim: `${app} está na lista de apps ilimitados do book. Não afirma consumo zero de dados.` },
      content: list.map((o) => customerLine(o)).join("\n"),
    });
  }

  const withInstall = offers.filter((o) => o.installationIncluded);
  if (withInstall.length) {
    docs.push({
      title: "Instalação inclusa",
      category: "FIBRA",
      queryTerms: ["instalacao", "instalação", "incluso"],
      facts: { offerIds: withInstall.map((o) => o.id) },
      content: withInstall.map((o) => customerLine(o)).join("\n"),
    });
  }
  const withWifi = offers.filter((o) => o.wifiIncluded);
  if (withWifi.length) {
    docs.push({
      title: "Wi-Fi incluso",
      category: "FIBRA",
      queryTerms: ["wifi", "wi-fi"],
      facts: { offerIds: withWifi.map((o) => o.id) },
      content: withWifi.map((o) => customerLine(o)).join("\n"),
    });
  }
  const withRoaming = offers.filter((o) => o.roamingGb);
  if (withRoaming.length) {
    docs.push({
      title: "Roaming cadastrado",
      category: "MOVEL",
      queryTerms: ["roaming"],
      facts: { offerIds: withRoaming.map((o) => o.id) },
      content: withRoaming.map((o) => `${o.name}: ${o.roamingGb} GB de roaming`).join("\n"),
    });
  }

  if (docs.length) {
    await prisma.productKnowledge.createMany({
      data: docs.map((d) => ({ ...d, bookId, approved: true })),
    });
  }
}

function customerLine(o: {
  name: string;
  promotionalPriceCents: number | null;
  priceCents: number | null;
  futurePriceCents: number | null;
  promotionDurationMonths: number | null;
  city: string | null;
}) {
  const promo = o.promotionalPriceCents ?? o.priceCents;
  const future = o.futurePriceCents;
  const months = o.promotionDurationMonths;
  const price = promo != null ? `R$ ${(promo / 100).toFixed(2).replace(".", ",")}` : "preço não cadastrado";
  const after =
    future != null && future !== promo
      ? ` por ${months ?? "o período cadastrado"}, depois R$ ${(future / 100).toFixed(2).replace(".", ",")}`
      : "";
  return `${o.name} (${o.city ?? "cidade do book"}): ${price}${after}`;
}

function streamingProviders(o: { includedStreaming: unknown }) {
  const list = Array.isArray(o.includedStreaming) ? (o.includedStreaming as { provider?: string }[]) : [];
  return list.map((s) => s.provider).filter(Boolean) as string[];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function group<T>(items: T[], key: (item: T) => string) {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    map[k] = map[k] ?? [];
    map[k].push(item);
  }
  return map;
}
