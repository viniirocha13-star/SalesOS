import { prisma } from "@/lib/prisma";
import type { KnowledgeType } from "@prisma/client";

export async function retrieveKnowledge(query: string, types?: KnowledgeType[], take = 4) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 3)
    .slice(0, 6);

  const docs = await prisma.knowledgeDocument.findMany({
    where: {
      active: true,
      approved: true,
      ...(types ? { type: { in: types } } : {}),
    },
    take: 40,
  });

  const ranked = docs
    .map((doc) => {
      const hay = `${doc.title} ${doc.content}`.toLowerCase();
      const hits = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { doc, hits };
    })
    .filter((r) => r.hits > 0 || terms.length === 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, take);

  return ranked.map((r) => r.doc);
}
