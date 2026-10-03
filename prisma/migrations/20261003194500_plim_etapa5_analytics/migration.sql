-- AlterTable
ALTER TABLE "PlimWorkspaceSettings" ADD COLUMN "metaAdsToken" TEXT;

-- AlterTable
ALTER TABLE "PlimClickEvent" ADD COLUMN "destination" TEXT,
ADD COLUMN "utmSource" TEXT,
ADD COLUMN "utmMedium" TEXT,
ADD COLUMN "utmCampaign" TEXT,
ADD COLUMN "utmContent" TEXT,
ADD COLUMN "utmTerm" TEXT;

-- AlterTable
ALTER TABLE "PlimCommissionEvent" ADD COLUMN "subId" TEXT,
ADD COLUMN "groupId" TEXT,
ADD COLUMN "campaignId" TEXT;

-- CreateTable
CREATE TABLE "PlimContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "source" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimExclusion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlimExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimErrorLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "payload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handlerKey" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlimErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlimCampaignMap" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupId" TEXT,
    "linkUrl" TEXT,
    "investment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlimCampaignMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlimCommissionEvent_tenantId_groupId_idx" ON "PlimCommissionEvent"("tenantId", "groupId");

-- CreateIndex
CREATE INDEX "PlimCommissionEvent_tenantId_campaignId_idx" ON "PlimCommissionEvent"("tenantId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PlimContact_tenantId_phone_key" ON "PlimContact"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "PlimContact_tenantId_importedAt_idx" ON "PlimContact"("tenantId", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlimExclusion_tenantId_phone_key" ON "PlimExclusion"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "PlimErrorLog_tenantId_createdAt_idx" ON "PlimErrorLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PlimErrorLog_tenantId_resolved_idx" ON "PlimErrorLog"("tenantId", "resolved");

-- CreateIndex
CREATE INDEX "PlimCampaignMap_tenantId_idx" ON "PlimCampaignMap"("tenantId");

-- AddForeignKey
ALTER TABLE "PlimCommissionEvent" ADD CONSTRAINT "PlimCommissionEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimContact" ADD CONSTRAINT "PlimContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimContact" ADD CONSTRAINT "PlimContact_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimExclusion" ADD CONSTRAINT "PlimExclusion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimErrorLog" ADD CONSTRAINT "PlimErrorLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimCampaignMap" ADD CONSTRAINT "PlimCampaignMap_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlimCampaignMap" ADD CONSTRAINT "PlimCampaignMap_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PlimGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
