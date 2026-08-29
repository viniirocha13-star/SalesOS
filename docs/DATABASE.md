# Banco

PostgreSQL + Prisma. Migrations em `prisma/migrations`.

Entidades novas do marco: Tenant, ConversationMemory, SalesStageHistory, CustomerFact, CommercialAcceptance, WhatsAppInboundEvent, Prompt/PromptVersion, WhatsAppTemplate, RequiredFieldDefinition, Integration, Notification, FollowUp, Workflow/WorkflowStep, ModelPrice.

Pipeline de lead (PT) permanece para o CRM operacional; `SalesStage` (EN) na conversa é a máquina comercial do orquestrador.

Índices: telefone, status, tenant+lastMessageAt, providerEventId unique (dedup Meta).
