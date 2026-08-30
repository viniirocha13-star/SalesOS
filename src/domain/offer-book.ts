import { prisma } from "@/lib/prisma";

/** Retira o book e todos os planos dele do Offer Engine. Pedidos já lançados permanecem. */
export async function retireOfferBook(bookId: string) {
  const book = await prisma.offerBook.findUnique({ where: { id: bookId } });
  if (!book) throw Object.assign(new Error("book_nao_encontrado"), { status: 404 });

  const retired = await prisma.offer.updateMany({
    where: { bookId },
    data: { status: "EXPIRADA" },
  });
  await prisma.productKnowledge.deleteMany({ where: { bookId } });
  await prisma.offerBook.update({
    where: { id: bookId },
    data: { status: "ARCHIVED" },
  });

  return { bookName: book.originalName, retiredOffers: retired.count };
}
