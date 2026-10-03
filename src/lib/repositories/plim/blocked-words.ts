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

export function addBlockedWord(tenantId: string, word: string) {
  const w = word.trim().toLowerCase();
  if (!w) throw new Error("Palavra inválida");
  return prisma.plimBlockedWord.upsert({
    where: { tenantId_word: { tenantId, word: w } },
    update: { active: true },
    create: { tenantId, word: w },
  });
}

export function removeBlockedWord(tenantId: string, id: string) {
  return prisma.plimBlockedWord.deleteMany({ where: { id, tenantId } });
}

export function setBlockedWordActive(tenantId: string, id: string, active: boolean) {
  return prisma.plimBlockedWord.updateMany({ where: { id, tenantId }, data: { active } });
}
