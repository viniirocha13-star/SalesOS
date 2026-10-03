-- CreateEnum
CREATE TYPE "PlimProfile" AS ENUM ('ADMIN', 'OPERADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "PlimOfferStatus" AS ENUM ('NOVA', 'EM_ANALISE', 'APROVADA', 'PROGRAMADA', 'NA_FILA', 'PUBLICADA', 'IGNORADA', 'ERRO');

-- CreateEnum
CREATE TYPE "PlimMarketplace" AS ENUM ('MERCADO_LIVRE', 'SHOPEE', 'AMAZON', 'MAGALU', 'ALIEXPRESS', 'SHEIN', 'AWIN', 'OUTRO');

-- CreateEnum
CREATE TYPE "PlimQueueItemStatus" AS ENUM ('AGUARDANDO', 'PROCESSANDO', 'ENVIADO', 'FALHOU', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PlimChannelPlatform" AS ENUM ('WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'EXTERNO');

-- CreateEnum
CREATE TYPE "PlimGroupRole" AS ENUM ('ORIGEM', 'DESTINO');

-- CreateEnum
CREATE TYPE "PlimRouteStatus" AS ENUM ('ATIVA', 'PAUSADA', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "PlimAutopilotStatus" AS ENUM ('ATIVO', 'PAUSADO', 'ARQUIVADO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plimProfile" "PlimProfile";

-- CreateTable
CREATE TABLE "PlimWorkspaceSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL DEFAULT 'PLIM AUTOMAÇÃO',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "testMode" BOOLEAN NOT NULL DEFAULT true,
    "brandName" TEXT NOT NULL DEFAULT 'PLIM PROMOS',
    "brandColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "logoPath" TEXT,
    "logoMargin" INTEGER NOT NULL DEFAULT 12,
    "logoSize" INTEGER NOT NULL DEFAULT 64,
    "logoOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.92,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimWorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "PlimChannelPlatform" NOT NULL,
    "groupRole" "PlimGroupRole" NOT NULL DEFAULT 'DESTINO',
    "externalId" TEXT,
    "niche" TEXT,
    "memberCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "dailyLimit" INTEGER,
    "minIntervalSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimChannelConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platform" "PlimChannelPlatform" NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',
    "lastSeenAt" TIMESTAMP(3),
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimOffer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "originalPrice" DECIMAL(12,2),
    "currentPrice" DECIMAL(12,2),
    "discountPercent" INTEGER,
    "coupon" TEXT,
    "marketplace" "PlimMarketplace" NOT NULL,
    "originalLink" TEXT,
    "affiliateLink" TEXT,
    "shortLink" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "status" "PlimOfferStatus" NOT NULL DEFAULT 'NOVA',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimRoute" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PlimRouteStatus" NOT NULL DEFAULT 'ATIVA',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimAutopilot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketplace" "PlimMarketplace",
    "status" "PlimAutopilotStatus" NOT NULL DEFAULT 'ATIVO',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimAutopilot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimQueueItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "productName" TEXT NOT NULL,
    "destination" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "status" "PlimQueueItemStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimClickEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "offerId" TEXT,
    "groupId" TEXT,
    "marketplace" "PlimMarketplace",
    "campaign" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "referrer" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlimClickEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimCommissionEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "marketplace" "PlimMarketplace" NOT NULL,
    "orderId" TEXT,
    "productName" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlimCommissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlimWorkspaceSettings_tenantId_key" ON "PlimWorkspaceSettings"("tenantId");

-- CreateIndex
CREATE INDEX "PlimGroup_tenantId_idx" ON "PlimGroup"("tenantId");

-- CreateIndex
CREATE INDEX "PlimChannelConnection_tenantId_platform_idx" ON "PlimChannelConnection"("tenantId", "platform");

-- CreateIndex
CREATE INDEX "PlimOffer_tenantId_status_idx" ON "PlimOffer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PlimOffer_tenantId_capturedAt_idx" ON "PlimOffer"("tenantId", "capturedAt");

-- CreateIndex
CREATE INDEX "PlimRoute_tenantId_idx" ON "PlimRoute"("tenantId");

-- CreateIndex
CREATE INDEX "PlimAutopilot_tenantId_idx" ON "PlimAutopilot"("tenantId");

-- CreateIndex
CREATE INDEX "PlimQueueItem_tenantId_status_idx" ON "PlimQueueItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PlimClickEvent_tenantId_clickedAt_idx" ON "PlimClickEvent"("tenantId", "clickedAt");

-- CreateIndex
CREATE INDEX "PlimCommissionEvent_tenantId_occurredAt_idx" ON "PlimCommissionEvent"("tenantId", "occurredAt");

-- AddForeignKey
ALTER TABLE "PlimWorkspaceSettings" ADD CONSTRAINT "PlimWorkspaceSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimGroup" ADD CONSTRAINT "PlimGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimChannelConnection" ADD CONSTRAINT "PlimChannelConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimOffer" ADD CONSTRAINT "PlimOffer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimRoute" ADD CONSTRAINT "PlimRoute_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimAutopilot" ADD CONSTRAINT "PlimAutopilot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimQueueItem" ADD CONSTRAINT "PlimQueueItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimClickEvent" ADD CONSTRAINT "PlimClickEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimClickEvent" ADD CONSTRAINT "PlimClickEvent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PlimOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimClickEvent" ADD CONSTRAINT "PlimClickEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimCommissionEvent" ADD CONSTRAINT "PlimCommissionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
