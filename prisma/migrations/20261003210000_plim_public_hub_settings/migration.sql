-- Grupos públicos (hub mestre) e credenciais PLIM no workspace (servidor apenas).

ALTER TABLE "PlimGroup" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;
ALTER TABLE "PlimGroup" ADD COLUMN IF NOT EXISTS "isMasterHub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PlimGroup" ADD COLUMN IF NOT EXISTS "memberLimit" INTEGER;
ALTER TABLE "PlimGroup" ADD COLUMN IF NOT EXISTS "publicRedirectUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PlimGroup_publicSlug_key" ON "PlimGroup"("publicSlug");

ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN IF NOT EXISTS "affiliateConfig" JSONB;
ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN IF NOT EXISTS "telegramBotToken" TEXT;
ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN IF NOT EXISTS "openAiModel" TEXT;
ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN IF NOT EXISTS "trackingBaseUrl" TEXT;
