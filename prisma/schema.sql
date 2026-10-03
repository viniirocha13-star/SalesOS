warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SUPERVISOR', 'OPERADOR', 'OPERATOR', 'ANALISTA', 'ANALYST');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'EM_ATENDIMENTO_IA', 'QUALIFICANDO', 'CONSULTANDO_VIABILIDADE', 'OFERTA_APRESENTADA', 'NEGOCIANDO', 'ACEITE_COMERCIAL', 'COLETANDO_DADOS', 'PRONTO_PARA_LANCAMENTO', 'EM_LANCAMENTO', 'PENDENCIA', 'CADASTRO_APROVADO', 'CONTRATO', 'DOCUMENTACAO', 'AGUARDANDO_INSTALACAO', 'INSTALADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('META', 'GOOGLE', 'INSTAGRAM', 'FACEBOOK', 'QR_CODE', 'LINK', 'ORGANICO', 'INDICACAO', 'OUTROS');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DETECTADA', 'AGUARDANDO_APROVACAO', 'APROVADA', 'REJEITADA', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'REVIEW_REQUIRED', 'APPROVED', 'ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AcquisitionType" AS ENUM ('NEW_CUSTOMER', 'RETENTION', 'MIGRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('OFERTAS', 'FAQ', 'REGRAS_COMERCIAIS', 'PROCEDIMENTOS', 'OBJECOES', 'DOCUMENTOS', 'POLITICAS');

-- CreateEnum
CREATE TYPE "ViabilityResult" AS ENUM ('VIAVEL', 'NAO_VIAVEL', 'INDETERMINADO');

-- CreateEnum
CREATE TYPE "PreSaleStatus" AS ENUM ('RASCUNHO', 'PRONTA', 'EM_LANCAMENTO', 'APROVADA', 'PENDENCIA', 'REPROVADA');

-- CreateEnum
CREATE TYPE "LaunchResult" AS ENUM ('APROVADO', 'PENDENCIA', 'REPROVADO');

-- CreateEnum
CREATE TYPE "ObjectionCategory" AS ENUM ('PRECO', 'VAI_PENSAR', 'CONCORRENTE', 'FIDELIDADE', 'INSTALACAO', 'CONVERSAR_COM_FAMILIA', 'SEM_INTERESSE', 'JA_POSSUI_INTERNET', 'PORTABILIDADE', 'OUTROS');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WHATSAPP', 'SIMULATOR');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('IA_ATIVA', 'HANDOFF_HUMANO', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "HandoffReason" AS ENUM ('CLIENTE_SOLICITOU', 'IA_SEM_CONFIANCA', 'INFORMACAO_NAO_ENCONTRADA', 'RECLAMACAO', 'CASO_SENSIVEL', 'FALHA_VIABILIDADE', 'EXCECAO_COMERCIAL', 'FALHA_REPETIDA_IA');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('ABERTO', 'EM_ATENDIMENTO', 'DEVOLVIDO_IA', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "DomainEventType" AS ENUM ('LEAD_CREATED', 'MESSAGE_RECEIVED', 'MESSAGE_BUFFER_READY', 'AI_RESPONSE_REQUESTED', 'VIABILITY_CHECKED', 'OFFER_PRESENTED', 'OBJECTION_DETECTED', 'BUYING_INTENT_DETECTED', 'CUSTOMER_ACCEPTED', 'COMMERCIAL_ACCEPTED', 'PRE_SALE_CREATED', 'PRE_SALE_READY', 'OPERATOR_ASSIGNED', 'SALE_REGISTERED', 'SALE_PENDING', 'SALE_REJECTED', 'CONTRACT_PENDING', 'SALE_INSTALLED', 'HUMAN_HANDOFF_STARTED', 'HUMAN_HANDOFF_ENDED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageActor" AS ENUM ('CUSTOMER', 'AI', 'HUMAN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SalesStage" AS ENUM ('NEW', 'GREETING', 'DISCOVERY', 'LOCATION_COLLECTION', 'VIABILITY_CHECK', 'NEEDS_ANALYSIS', 'OFFER_SELECTION', 'OFFER_PRESENTATION', 'NEGOTIATION', 'OBJECTION_HANDLING', 'BUYING_INTENT', 'COMMERCIAL_ACCEPTANCE', 'DATA_COLLECTION', 'PRE_SALE_READY', 'WAITING_OPERATOR', 'OPERATOR_PROCESSING', 'OPERATOR_PENDING', 'REGISTERED', 'CONTRACT_PENDING', 'DOCUMENT_PENDING', 'INSTALLATION_PENDING', 'INSTALLED', 'LOST', 'HUMAN_HANDOFF');

-- CreateEnum
CREATE TYPE "IntentType" AS ENUM ('BUY', 'QUESTION', 'OBJECTION', 'NEGOTIATION', 'CANCEL', 'HUMAN_REQUEST', 'SEND_DOCUMENT', 'ADDRESS', 'PERSONAL_DATA', 'COMPLAINT', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

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

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERADOR',
    "plimProfile" "PlimProfile",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "neighborhood" TEXT,
    "address" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "origin" "LeadSource" NOT NULL DEFAULT 'OUTROS',
    "source" TEXT,
    "campaignId" TEXT,
    "adset" TEXT,
    "ad" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "clickId" TEXT,
    "landingPage" TEXT,
    "productInterest" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOVO',
    "score" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "customerId" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusHistory" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "LeadStatus",
    "toStatus" "LeadStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "documentCpf" TEXT,
    "documentCpfEncrypted" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "LeadSource" NOT NULL,
    "externalId" TEXT,
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferBook" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "extractedText" TEXT,
    "month" TEXT,
    "importedById" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'ACTIVE',
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "product" TEXT,
    "speedMbps" INTEGER,
    "priceCents" INTEGER,
    "promotionalPriceCents" INTEGER,
    "futurePriceCents" INTEGER,
    "promotionalPeriod" TEXT,
    "benefits" TEXT[],
    "loyalty" TEXT,
    "installation" TEXT,
    "city" TEXT,
    "region" TEXT,
    "eligibility" TEXT,
    "rules" TEXT,
    "restrictions" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "source" TEXT,
    "bookId" TEXT,
    "originalText" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'DETECTADA',
    "reviewNotes" TEXT,
    "acquisitionType" "AcquisitionType",
    "salesChannelRaw" TEXT,
    "channelAllows" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "channelExcludes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryNormalized" TEXT,
    "offerLevel" TEXT,
    "pricingPeriodDescription" TEXT,
    "pricingOriginalText" TEXT,
    "promotionDurationMonths" INTEGER,
    "includedProducts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unlimitedApps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "launchCodes" TEXT,
    "includedStreaming" JSONB,
    "featuresOriginalText" TEXT,
    "installationIncluded" BOOLEAN,
    "wifiIncluded" BOOLEAN,
    "unlimitedCalls" BOOLEAN,
    "unlimitedSms" BOOLEAN,
    "roamingGb" DOUBLE PRECISION,
    "deviceLoan" BOOLEAN,
    "isCombo" BOOLEAN NOT NULL DEFAULT false,
    "mobileDataGb" INTEGER,
    "fwaAllowanceGb" INTEGER,
    "fingerprint" TEXT,
    "sourceRow" INTEGER,
    "sourceSheet" TEXT,
    "sourceFile" TEXT,
    "validationErrors" JSONB,
    "validationWarnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "KnowledgeType" NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "leadId" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'SIMULATOR',
    "waConversationId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'IA_ATIVA',
    "salesStage" "SalesStage" NOT NULL DEFAULT 'NEW',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lockOwnerId" TEXT,
    "lockUntil" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "actor" "MessageActor" NOT NULL DEFAULT 'CUSTOMER',
    "body" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "templateName" TEXT,
    "waMessageId" TEXT,
    "providerMessageId" TEXT,
    "wamid" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "idempotencyKey" TEXT,
    "buffered" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViabilityCheck" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "address" TEXT,
    "zipCode" TEXT,
    "city" TEXT,
    "neighborhood" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "result" "ViabilityResult" NOT NULL,
    "source" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViabilityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "category" "ObjectionCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "response" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Objection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectionPlaybook" (
    "id" TEXT NOT NULL,
    "category" "ObjectionCategory" NOT NULL,
    "argument" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectionPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreSale" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "customerId" TEXT,
    "registrationData" JSONB,
    "address" TEXT,
    "viabilitySummary" TEXT,
    "consentsSnapshot" JSONB,
    "aiSummary" TEXT,
    "status" "PreSaleStatus" NOT NULL DEFAULT 'PRONTA',
    "ownerId" TEXT,
    "quoteNumber" TEXT,
    "orderNumber" TEXT,
    "launchResult" "LaunchResult",
    "launchNotes" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "preSaleId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT,
    "offerId" TEXT NOT NULL,
    "ticketCents" INTEGER,
    "installedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleEvent" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "type" "DomainEventType" NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "type" "DomainEventType" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanHandoff" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reason" "HandoffReason" NOT NULL,
    "notes" TEXT,
    "status" "HandoffStatus" NOT NULL DEFAULT 'ABERTO',
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "HumanHandoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "leadId" TEXT,
    "model" TEXT NOT NULL,
    "intent" TEXT,
    "toolName" TEXT,
    "offerId" TEXT,
    "knowledgeSource" TEXT,
    "confidence" DOUBLE PRECISION,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cachedTokens" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "purpose" TEXT,
    "result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppLog" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMemory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT,
    "customerFacts" JSONB,
    "commercialState" JSONB,
    "objections" JSONB,
    "offersPresented" JSONB,
    "acceptedOfferId" TEXT,
    "pendingQuestions" JSONB,
    "importantEvents" JSONB,
    "lastSummarizedMessageId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesStageHistory" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromStage" "SalesStage",
    "toStage" "SalesStage" NOT NULL,
    "reason" TEXT,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFact" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialAcceptance" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "messageId" TEXT,
    "offerSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppInboundEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppInboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptVersion" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "providerTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt_BR',
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "variables" JSONB,
    "purpose" TEXT,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequiredFieldDefinition" (
    "id" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "pattern" TEXT,

    CONSTRAINT "RequiredFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastError" TEXT,
    "testedAt" TIMESTAMP(3),

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "templateName" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "cancelled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "template" TEXT,
    "condition" JSONB,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelPrice" (
    "id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputPerMTok" DOUBLE PRECISION NOT NULL,
    "outputPerMTok" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPresentation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferPresentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialDecision" (
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

-- CreateTable
CREATE TABLE "ComplexityEscalation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "fromModel" TEXT NOT NULL,
    "toModel" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplexityEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
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
    "metaAdsToken" TEXT,
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
    "destination" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
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
    "subId" TEXT,
    "groupId" TEXT,
    "campaignId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDemo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlimCommissionEvent_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");

-- CreateIndex
CREATE INDEX "Lead_city_idx" ON "Lead"("city");

-- CreateIndex
CREATE INDEX "Lead_tenantId_idx" ON "Lead"("tenantId");

-- CreateIndex
CREATE INDEX "LeadStatusHistory_leadId_idx" ON "LeadStatusHistory"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_city_idx" ON "Offer"("city");

-- CreateIndex
CREATE INDEX "Offer_fingerprint_idx" ON "Offer"("fingerprint");

-- CreateIndex
CREATE INDEX "Offer_categoryNormalized_idx" ON "Offer"("categoryNormalized");

-- CreateIndex
CREATE INDEX "ProductKnowledge_bookId_idx" ON "ProductKnowledge"("bookId");

-- CreateIndex
CREATE INDEX "Conversation_leadId_idx" ON "Conversation"("leadId");

-- CreateIndex
CREATE INDEX "Conversation_tenantId_lastMessageAt_idx" ON "Conversation"("tenantId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_status_aiEnabled_idx" ON "Conversation"("status", "aiEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "Message_waMessageId_key" ON "Message"("waMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "Message_idempotencyKey_key" ON "Message"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ViabilityCheck_leadId_idx" ON "ViabilityCheck"("leadId");

-- CreateIndex
CREATE INDEX "PreSale_status_idx" ON "PreSale"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_preSaleId_key" ON "Sale"("preSaleId");

-- CreateIndex
CREATE INDEX "DomainEvent_type_idx" ON "DomainEvent"("type");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIExecution_conversationId_idx" ON "AIExecution"("conversationId");

-- CreateIndex
CREATE INDEX "AIExecution_leadId_idx" ON "AIExecution"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_entity_key" ON "RetentionPolicy"("entity");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMemory_conversationId_key" ON "ConversationMemory"("conversationId");

-- CreateIndex
CREATE INDEX "SalesStageHistory_conversationId_idx" ON "SalesStageHistory"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFact_leadId_key_key" ON "CustomerFact"("leadId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInboundEvent_providerEventId_key" ON "WhatsAppInboundEvent"("providerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_slug_key" ON "Prompt"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PromptVersion_promptId_version_key" ON "PromptVersion"("promptId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_slug_key" ON "Integration"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPrice_model_key" ON "ModelPrice"("model");

-- CreateIndex
CREATE INDEX "OfferPresentation_conversationId_idx" ON "OfferPresentation"("conversationId");

-- CreateIndex
CREATE INDEX "CommercialDecision_conversationId_createdAt_idx" ON "CommercialDecision"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ComplexityEscalation_conversationId_idx" ON "ComplexityEscalation"("conversationId");

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

-- CreateIndex
CREATE INDEX "PlimCommissionEvent_tenantId_groupId_idx" ON "PlimCommissionEvent"("tenantId", "groupId");

-- CreateIndex
CREATE INDEX "PlimCommissionEvent_tenantId_campaignId_idx" ON "PlimCommissionEvent"("tenantId", "campaignId");

-- CreateIndex
CREATE INDEX "PlimContact_tenantId_importedAt_idx" ON "PlimContact"("tenantId", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlimContact_tenantId_phone_key" ON "PlimContact"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "PlimExclusion_tenantId_phone_key" ON "PlimExclusion"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "PlimErrorLog_tenantId_createdAt_idx" ON "PlimErrorLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PlimErrorLog_tenantId_resolved_idx" ON "PlimErrorLog"("tenantId", "resolved");

-- CreateIndex
CREATE INDEX "PlimCampaignMap_tenantId_idx" ON "PlimCampaignMap"("tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "OfferBook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductKnowledge" ADD CONSTRAINT "ProductKnowledge_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "OfferBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeVersion" ADD CONSTRAINT "KnowledgeVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViabilityCheck" ADD CONSTRAINT "ViabilityCheck_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objection" ADD CONSTRAINT "Objection_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSale" ADD CONSTRAINT "PreSale_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSale" ADD CONSTRAINT "PreSale_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSale" ADD CONSTRAINT "PreSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreSale" ADD CONSTRAINT "PreSale_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_preSaleId_fkey" FOREIGN KEY ("preSaleId") REFERENCES "PreSale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleEvent" ADD CONSTRAINT "SaleEvent_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanHandoff" ADD CONSTRAINT "HumanHandoff_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIExecution" ADD CONSTRAINT "AIExecution_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMemory" ADD CONSTRAINT "ConversationMemory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStageHistory" ADD CONSTRAINT "SalesStageHistory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFact" ADD CONSTRAINT "CustomerFact_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAcceptance" ADD CONSTRAINT "CommercialAcceptance_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptVersion" ADD CONSTRAINT "PromptVersion_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

