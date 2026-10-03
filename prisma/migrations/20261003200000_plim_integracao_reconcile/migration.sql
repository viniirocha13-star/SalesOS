-- Reconciliação pós-merge operação + analytics (schema.prisma unificado).
-- Garante colunas opcionais quando apenas um ramo de migração foi aplicado antes da integração.

ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN IF NOT EXISTS "duplicateWindowHours" INTEGER NOT NULL DEFAULT 24;
ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN IF NOT EXISTS "metaAdsToken" TEXT;
