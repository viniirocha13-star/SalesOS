import { prisma } from "@/lib/prisma";

const SEED_WORDS = ["usado", "recondicionado", "seminovo", "réplica"];

export async function ensureBlockedWordSeeds(tenantId: string) {
  for (const word of SEED_WORDS) {
    await prisma.plimBlockedWord.upsert({
      where: { tenantId_word: { tenantId, word } },
      update: {},
      create: { tenantId, word },
    });
  }
}

export function listBlockedWords(tenantId: string) {
  return prisma.plimBlockedWord.findMany({ where: { tenantId }, orderBy: { word: "asc" } });
}
