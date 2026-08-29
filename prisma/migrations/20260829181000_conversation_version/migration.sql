-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ConversationMemory" ADD COLUMN IF NOT EXISTS "lastSummarizedMessageId" TEXT;
