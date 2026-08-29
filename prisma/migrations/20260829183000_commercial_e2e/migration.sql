ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "documentCpfEncrypted" TEXT;

CREATE TABLE IF NOT EXISTS "OfferPresentation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferPresentation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OfferPresentation_conversationId_idx" ON "OfferPresentation"("conversationId");

CREATE TABLE IF NOT EXISTS "CommercialDecision" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "intent" TEXT,
    "buyingIntent" TEXT,
    "objection" TEXT,
    "strategyLabel" TEXT,
    "selectedOfferId" TEXT,
    "toolCalls" JSONB,
    "confidence" DOUBLE PRECISION,
    "escalationReason" TEXT,
    "model" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommercialDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CommercialDecision_conversationId_createdAt_idx" ON "CommercialDecision"("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS "ComplexityEscalation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromModel" TEXT NOT NULL,
    "toModel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplexityEscalation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ComplexityEscalation_conversationId_idx" ON "ComplexityEscalation"("conversationId");

CREATE TABLE IF NOT EXISTS "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "conversationId" TEXT,
    "leadId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);
