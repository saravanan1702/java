-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "WorkspacePlan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "WorkspaceLanguage" AS ENUM ('EN', 'TA', 'TA_LATN');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "InstagramAccountStatus" AS ENUM ('ACTIVE', 'TOKEN_EXPIRING', 'TOKEN_EXPIRED', 'REVOKED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "CapabilityStatus" AS ENUM ('UNKNOWN', 'SUPPORTED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "MediaAutomationState" AS ENUM ('ENABLED', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('COMMENT', 'DIRECT_MESSAGE');

-- CreateEnum
CREATE TYPE "RuleMediaScope" AS ENUM ('ALL_MEDIA', 'SELECTED_MEDIA', 'NONE');

-- CreateEnum
CREATE TYPE "KeywordMatchType" AS ENUM ('EXACT', 'CONTAINS', 'STARTS_WITH');

-- CreateEnum
CREATE TYPE "RuleAction" AS ENUM ('SEND_TEMPLATE', 'HUMAN_HANDOVER', 'START_FLOW', 'AI_REPLY');

-- CreateEnum
CREATE TYPE "FlowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'PENDING_HUMAN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('CUSTOMER', 'KEYWORD_RULE', 'FLOW', 'AI', 'AGENT', 'PRIVATE_REPLY');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "KnowledgeSource" AS ENUM ('PRODUCT', 'FAQ', 'POLICY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'SKIPPED', 'SENT', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('AI_REQUESTS', 'AI_INPUT_TOKENS', 'AI_OUTPUT_TOKENS', 'DMS_SENT', 'PRIVATE_REPLIES_SENT', 'WEBHOOK_EVENTS');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "lastWorkspaceId" UUID,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "userAgent" VARCHAR(512),
    "ip" VARCHAR(64),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "plan" "WorkspacePlan" NOT NULL DEFAULT 'FREE',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    "defaultLanguage" "WorkspaceLanguage" NOT NULL DEFAULT 'EN',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "invitedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "invitedById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "igUserId" VARCHAR(64) NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160),
    "profilePictureUrl" TEXT,
    "accountType" VARCHAR(32),
    "status" "InstagramAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "grantedScopes" TEXT[],
    "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "connectedById" UUID,
    "lastSyncedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "instagramAccountId" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'instagram',
    "accessTokenEnc" TEXT NOT NULL,
    "encKeyVersion" INTEGER NOT NULL,
    "tokenType" VARCHAR(32),
    "expiresAt" TIMESTAMP(3),
    "lastRefreshedAt" TIMESTAMP(3),
    "refreshFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramMedia" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "instagramAccountId" UUID NOT NULL,
    "igMediaId" VARCHAR(64) NOT NULL,
    "mediaType" VARCHAR(32),
    "mediaProductType" VARCHAR(32),
    "caption" TEXT,
    "permalink" TEXT,
    "thumbnailUrl" TEXT,
    "mediaUrl" TEXT,
    "postedAt" TIMESTAMP(3),
    "automationState" "MediaAutomationState" NOT NULL DEFAULT 'ENABLED',
    "globalRulesExcluded" BOOLEAN NOT NULL DEFAULT false,
    "commentWebhookSupport" "CapabilityStatus" NOT NULL DEFAULT 'UNKNOWN',
    "capabilityNote" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "instagramAccountId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL DEFAULT 'COMMENT',
    "mediaScope" "RuleMediaScope" NOT NULL DEFAULT 'SELECTED_MEDIA',
    "matchType" "KeywordMatchType" NOT NULL DEFAULT 'CONTAINS',
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "normalizeText" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "action" "RuleAction" NOT NULL DEFAULT 'SEND_TEMPLATE',
    "replyTemplate" TEXT,
    "publicReplyText" TEXT,
    "flowId" UUID,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastExecutedAt" TIMESTAMP(3),
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationKeyword" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "keyword" VARCHAR(100) NOT NULL,
    "normalized" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRuleMedia" (
    "workspaceId" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRuleMedia_pkey" PRIMARY KEY ("ruleId","mediaId")
);

-- CreateTable
CREATE TABLE "AutomationFlow" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "instagramAccountId" UUID,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "FlowStatus" NOT NULL DEFAULT 'DRAFT',
    "activeVersion" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlowVersion" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "flowId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "definition" JSONB NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "instagramAccountId" UUID NOT NULL,
    "igScopedUserId" VARCHAR(64) NOT NULL,
    "customerUsername" VARCHAR(64),
    "customerName" VARCHAR(160),
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "aiPaused" BOOLEAN NOT NULL DEFAULT false,
    "humanTakeover" BOOLEAN NOT NULL DEFAULT false,
    "assignedToId" UUID,
    "tags" TEXT[],
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationNote" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "authorId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "source" "MessageSource" NOT NULL,
    "text" TEXT,
    "igMessageId" VARCHAR(255),
    "status" "MessageStatus" NOT NULL,
    "error" TEXT,
    "sentById" UUID,
    "executionId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "url" TEXT,
    "imageUrl" TEXT,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'UNKNOWN',
    "colours" TEXT[],
    "deliveryDetails" TEXT,
    "returnPolicy" TEXT,
    "faq" JSONB,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "productId" UUID,
    "source" "KnowledgeSource" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID,
    "instagramAccountId" UUID,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'instagram',
    "field" VARCHAR(64) NOT NULL,
    "dedupeKey" VARCHAR(255) NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "instagramAccountId" UUID NOT NULL,
    "ruleId" UUID,
    "flowId" UUID,
    "mediaId" UUID,
    "conversationId" UUID,
    "webhookEventId" UUID,
    "trigger" "AutomationTrigger" NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "igCommentId" VARCHAR(64),
    "matchedKeyword" VARCHAR(100),
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "apiResponse" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "periodDay" DATE NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "workspaceId" UUID,
    "actorId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "targetType" VARCHAR(60),
    "targetId" VARCHAR(64),
    "metadata" JSONB,
    "ip" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_purpose_idx" ON "VerificationToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_deletedAt_idx" ON "Workspace"("deletedAt");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_role_idx" ON "WorkspaceMember"("workspaceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvitation_tokenHash_key" ON "WorkspaceInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_workspaceId_email_idx" ON "WorkspaceInvitation"("workspaceId", "email");

-- CreateIndex
CREATE INDEX "WorkspaceInvitation_email_idx" ON "WorkspaceInvitation"("email");

-- CreateIndex
CREATE INDEX "InstagramAccount_igUserId_idx" ON "InstagramAccount"("igUserId");

-- CreateIndex
CREATE INDEX "InstagramAccount_status_idx" ON "InstagramAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_id_workspaceId_key" ON "InstagramAccount"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_workspaceId_igUserId_key" ON "InstagramAccount"("workspaceId", "igUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_instagramAccountId_key" ON "OAuthToken"("instagramAccountId");

-- CreateIndex
CREATE INDEX "OAuthToken_workspaceId_idx" ON "OAuthToken"("workspaceId");

-- CreateIndex
CREATE INDEX "OAuthToken_expiresAt_idx" ON "OAuthToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_instagramAccountId_workspaceId_key" ON "OAuthToken"("instagramAccountId", "workspaceId");

-- CreateIndex
CREATE INDEX "InstagramMedia_workspaceId_instagramAccountId_postedAt_idx" ON "InstagramMedia"("workspaceId", "instagramAccountId", "postedAt" DESC);

-- CreateIndex
CREATE INDEX "InstagramMedia_workspaceId_mediaProductType_idx" ON "InstagramMedia"("workspaceId", "mediaProductType");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMedia_id_workspaceId_key" ON "InstagramMedia"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMedia_instagramAccountId_igMediaId_key" ON "InstagramMedia"("instagramAccountId", "igMediaId");

-- CreateIndex
CREATE INDEX "AutomationRule_workspaceId_instagramAccountId_enabled_prior_idx" ON "AutomationRule"("workspaceId", "instagramAccountId", "enabled", "priority");

-- CreateIndex
CREATE INDEX "AutomationRule_workspaceId_deletedAt_idx" ON "AutomationRule"("workspaceId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_id_workspaceId_key" ON "AutomationRule"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "AutomationKeyword_workspaceId_normalized_idx" ON "AutomationKeyword"("workspaceId", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationKeyword_ruleId_normalized_key" ON "AutomationKeyword"("ruleId", "normalized");

-- CreateIndex
CREATE INDEX "AutomationRuleMedia_workspaceId_mediaId_idx" ON "AutomationRuleMedia"("workspaceId", "mediaId");

-- CreateIndex
CREATE INDEX "AutomationFlow_workspaceId_status_idx" ON "AutomationFlow"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationFlow_id_workspaceId_key" ON "AutomationFlow"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "FlowVersion_workspaceId_idx" ON "FlowVersion"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FlowVersion_flowId_version_key" ON "FlowVersion"("flowId", "version");

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_lastMessageAt_idx" ON "Conversation"("workspaceId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "Conversation_workspaceId_status_idx" ON "Conversation"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_id_workspaceId_key" ON "Conversation"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_instagramAccountId_igScopedUserId_key" ON "Conversation"("instagramAccountId", "igScopedUserId");

-- CreateIndex
CREATE INDEX "ConversationNote_workspaceId_conversationId_idx" ON "ConversationNote"("workspaceId", "conversationId");

-- CreateIndex
CREATE INDEX "Message_workspaceId_conversationId_createdAt_idx" ON "Message"("workspaceId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_workspaceId_igMessageId_key" ON "Message"("workspaceId", "igMessageId");

-- CreateIndex
CREATE INDEX "Product_workspaceId_deletedAt_idx" ON "Product"("workspaceId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_workspaceId_key" ON "Product"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_workspaceId_isApproved_deletedAt_idx" ON "KnowledgeDocument"("workspaceId", "isApproved", "deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_productId_idx" ON "KnowledgeDocument"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_dedupeKey_key" ON "WebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_workspaceId_receivedAt_idx" ON "WebhookEvent"("workspaceId", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_receivedAt_idx" ON "WebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationExecution_idempotencyKey_key" ON "AutomationExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AutomationExecution_workspaceId_createdAt_idx" ON "AutomationExecution"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationExecution_workspaceId_ruleId_status_idx" ON "AutomationExecution"("workspaceId", "ruleId", "status");

-- CreateIndex
CREATE INDEX "AutomationExecution_workspaceId_status_createdAt_idx" ON "AutomationExecution"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "UsageRecord_workspaceId_metric_periodDay_idx" ON "UsageRecord"("workspaceId", "metric", "periodDay");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_instagramAccountId_workspaceId_fkey" FOREIGN KEY ("instagramAccountId", "workspaceId") REFERENCES "InstagramAccount"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMedia" ADD CONSTRAINT "InstagramMedia_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMedia" ADD CONSTRAINT "InstagramMedia_instagramAccountId_workspaceId_fkey" FOREIGN KEY ("instagramAccountId", "workspaceId") REFERENCES "InstagramAccount"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_instagramAccountId_workspaceId_fkey" FOREIGN KEY ("instagramAccountId", "workspaceId") REFERENCES "InstagramAccount"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "AutomationFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationKeyword" ADD CONSTRAINT "AutomationKeyword_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationKeyword" ADD CONSTRAINT "AutomationKeyword_ruleId_workspaceId_fkey" FOREIGN KEY ("ruleId", "workspaceId") REFERENCES "AutomationRule"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRuleMedia" ADD CONSTRAINT "AutomationRuleMedia_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRuleMedia" ADD CONSTRAINT "AutomationRuleMedia_ruleId_workspaceId_fkey" FOREIGN KEY ("ruleId", "workspaceId") REFERENCES "AutomationRule"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRuleMedia" ADD CONSTRAINT "AutomationRuleMedia_mediaId_workspaceId_fkey" FOREIGN KEY ("mediaId", "workspaceId") REFERENCES "InstagramMedia"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFlow" ADD CONSTRAINT "AutomationFlow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFlow" ADD CONSTRAINT "AutomationFlow_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_flowId_workspaceId_fkey" FOREIGN KEY ("flowId", "workspaceId") REFERENCES "AutomationFlow"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowVersion" ADD CONSTRAINT "FlowVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_instagramAccountId_workspaceId_fkey" FOREIGN KEY ("instagramAccountId", "workspaceId") REFERENCES "InstagramAccount"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_conversationId_workspaceId_fkey" FOREIGN KEY ("conversationId", "workspaceId") REFERENCES "Conversation"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationNote" ADD CONSTRAINT "ConversationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_workspaceId_fkey" FOREIGN KEY ("conversationId", "workspaceId") REFERENCES "Conversation"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AutomationExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_instagramAccountId_workspaceId_fkey" FOREIGN KEY ("instagramAccountId", "workspaceId") REFERENCES "InstagramAccount"("id", "workspaceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "AutomationFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "InstagramMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
