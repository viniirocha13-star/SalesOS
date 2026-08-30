-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcquisitionType" AS ENUM ('NEW_CUSTOMER', 'RETENTION', 'MIGRATION', 'OTHER');

-- AlterTable
ALTER TABLE "OfferBook" ADD COLUMN     "status" "BookStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "lineCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "offerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "errorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warningCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stats" JSONB,
ADD COLUMN     "activatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "acquisitionType" "AcquisitionType",
ADD COLUMN     "salesChannelRaw" TEXT,
ADD COLUMN     "channelAllows" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "channelExcludes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "categoryNormalized" TEXT,
ADD COLUMN     "offerLevel" TEXT,
ADD COLUMN     "pricingPeriodDescription" TEXT,
ADD COLUMN     "pricingOriginalText" TEXT,
ADD COLUMN     "promotionDurationMonths" INTEGER,
ADD COLUMN     "includedProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "unlimitedApps" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "launchCodes" TEXT,
ADD COLUMN     "includedStreaming" JSONB,
ADD COLUMN     "featuresOriginalText" TEXT,
ADD COLUMN     "installationIncluded" BOOLEAN,
ADD COLUMN     "wifiIncluded" BOOLEAN,
ADD COLUMN     "unlimitedCalls" BOOLEAN,
ADD COLUMN     "unlimitedSms" BOOLEAN,
ADD COLUMN     "roamingGb" DOUBLE PRECISION,
ADD COLUMN     "deviceLoan" BOOLEAN,
ADD COLUMN     "isCombo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mobileDataGb" INTEGER,
ADD COLUMN     "fwaAllowanceGb" INTEGER,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "sourceRow" INTEGER,
ADD COLUMN     "sourceSheet" TEXT,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "validationErrors" JSONB,
ADD COLUMN     "validationWarnings" JSONB;

-- CreateTable
CREATE TABLE "ProductKnowledge" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "queryTerms" TEXT[],
    "facts" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductKnowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_fingerprint_idx" ON "Offer"("fingerprint");

-- CreateIndex
CREATE INDEX "Offer_categoryNormalized_idx" ON "Offer"("categoryNormalized");

-- CreateIndex
CREATE INDEX "ProductKnowledge_bookId_idx" ON "ProductKnowledge"("bookId");

-- AddForeignKey
ALTER TABLE "ProductKnowledge" ADD CONSTRAINT "ProductKnowledge_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "OfferBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
