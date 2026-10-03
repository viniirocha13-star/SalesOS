-- AlterEnum
ALTER TYPE "PlimQueueItemStatus" ADD VALUE 'PAUSADO';

-- CreateEnum
CREATE TYPE "PlimScheduleStatus" AS ENUM ('PENDENTE', 'MATERIALIZADO', 'CANCELADO');
CREATE TYPE "PlimScheduleRepeat" AS ENUM ('NENHUMA', 'DIARIA', 'SEMANAL');

-- AlterTable
ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN "duplicateWindowHours" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "PlimGroup" ADD COLUMN "accountLabel" TEXT,
ADD COLUMN "activeFrom" TEXT,
ADD COLUMN "activeTo" TEXT;

ALTER TABLE "PlimChannelConnection" ADD COLUMN "sendsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastError" TEXT;

ALTER TABLE "PlimOffer" ADD COLUMN "productId" TEXT,
ADD COLUMN "messageEmoji" TEXT,
ADD COLUMN "editorMessage" TEXT,
ADD COLUMN "ctaLabel" TEXT DEFAULT 'Comprar',
ADD COLUMN "duplicateHash" TEXT;

ALTER TABLE "PlimRoute" ADD COLUMN "originGroupId" TEXT,
ADD COLUMN "destinationGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "marketplaces" "PlimMarketplace"[] DEFAULT ARRAY[]::"PlimMarketplace"[],
ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiredWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "forbiddenWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "minPrice" DECIMAL(12,2),
ADD COLUMN "maxPrice" DECIMAL(12,2),
ADD COLUMN "minDiscount" INTEGER,
ADD COLUMN "intervalSec" INTEGER,
ADD COLUMN "activeFrom" TEXT,
ADD COLUMN "activeTo" TEXT,
ADD COLUMN "activeDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "avoidDuplicates" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PlimAutopilot" ADD COLUMN "searchQuery" TEXT,
ADD COLUMN "minPrice" DECIMAL(12,2),
ADD COLUMN "maxPrice" DECIMAL(12,2),
ADD COLUMN "minDiscount" INTEGER,
ADD COLUMN "dailyQuantity" INTEGER,
ADD COLUMN "activeFrom" TEXT,
ADD COLUMN "activeTo" TEXT,
ADD COLUMN "destinationGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "templateId" TEXT,
ADD COLUMN "sourceKey" TEXT;

ALTER TABLE "PlimQueueItem" ADD COLUMN "offerId" TEXT,
ADD COLUMN "groupId" TEXT,
ADD COLUMN "platform" "PlimChannelPlatform",
ADD COLUMN "messageBody" TEXT,
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "campaign" TEXT,
ADD COLUMN "testPayload" JSONB;

ALTER TABLE "PlimClickEvent" ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmTerm" TEXT,
ADD COLUMN "utmContent" TEXT;

CREATE INDEX "PlimOffer_tenantId_duplicateHash_idx" ON "PlimOffer"("tenantId", "duplicateHash");
CREATE INDEX "PlimQueueItem_tenantId_position_idx" ON "PlimQueueItem"("tenantId", "position");

CREATE TABLE "PlimShortLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "groupId" TEXT,
    "campaign" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlimShortLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlimMessageTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlimMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlimBlockedWord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlimBlockedWord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlimSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "destinationGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "repeat" "PlimScheduleRepeat" NOT NULL DEFAULT 'NENHUMA',
    "status" "PlimScheduleStatus" NOT NULL DEFAULT 'PENDENTE',
    "lastMaterializedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlimSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlimShortLink_code_key" ON "PlimShortLink"("code");
CREATE INDEX "PlimShortLink_tenantId_idx" ON "PlimShortLink"("tenantId");
CREATE INDEX "PlimMessageTemplate_tenantId_idx" ON "PlimMessageTemplate"("tenantId");
CREATE UNIQUE INDEX "PlimBlockedWord_tenantId_word_key" ON "PlimBlockedWord"("tenantId", "word");
CREATE INDEX "PlimBlockedWord_tenantId_idx" ON "PlimBlockedWord"("tenantId");
CREATE INDEX "PlimSchedule_tenantId_status_scheduledAt_idx" ON "PlimSchedule"("tenantId", "status", "scheduledAt");

ALTER TABLE "PlimQueueItem" ADD CONSTRAINT "PlimQueueItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PlimOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlimQueueItem" ADD CONSTRAINT "PlimQueueItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlimShortLink" ADD CONSTRAINT "PlimShortLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlimShortLink" ADD CONSTRAINT "PlimShortLink_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PlimOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlimShortLink" ADD CONSTRAINT "PlimShortLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlimMessageTemplate" ADD CONSTRAINT "PlimMessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlimBlockedWord" ADD CONSTRAINT "PlimBlockedWord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlimSchedule" ADD CONSTRAINT "PlimSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlimSchedule" ADD CONSTRAINT "PlimSchedule_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PlimOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
