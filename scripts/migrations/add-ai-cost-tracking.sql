-- AI Cost Tracking Migration
-- Week 3-4, Day 22-23: Production AI Deployment Preparation
-- Run this manually: psql -U connect -d connect -f scripts/migrations/add-ai-cost-tracking.sql

-- Create AI Service Type Enum
CREATE TYPE "AIServiceType" AS ENUM ('MATCH_EXPLANATION', 'QA_CHAT');

-- Create Alert Severity Enum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- Create AI Cost Logs Table
CREATE TABLE "ai_cost_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "serviceType" "AIServiceType" NOT NULL,
  "userId" TEXT,
  "organizationId" TEXT,
  "endpoint" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "costKRW" DOUBLE PRECISION NOT NULL,
  "duration" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "errorMessage" TEXT,
  "cacheHit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create AI Budget Alerts Table
CREATE TABLE "ai_budget_alerts" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" DATE NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "threshold" INTEGER NOT NULL,
  "amountSpent" DOUBLE PRECISION NOT NULL,
  "dailyLimit" DOUBLE PRECISION NOT NULL,
  "percentage" DOUBLE PRECISION NOT NULL,
  "alertSent" BOOLEAN NOT NULL DEFAULT false,
  "alertSentAt" TIMESTAMP(3),
  "recipientEmails" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add Foreign Key Constraints
ALTER TABLE "ai_cost_logs"
  ADD CONSTRAINT "ai_cost_logs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "ai_cost_logs"
  ADD CONSTRAINT "ai_cost_logs_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL;

-- Create Indexes
CREATE INDEX "ai_cost_logs_createdAt_idx" ON "ai_cost_logs"("createdAt");
CREATE INDEX "ai_cost_logs_serviceType_idx" ON "ai_cost_logs"("serviceType");
CREATE INDEX "ai_cost_logs_userId_idx" ON "ai_cost_logs"("userId");
CREATE INDEX "ai_cost_logs_organizationId_idx" ON "ai_cost_logs"("organizationId");
CREATE INDEX "ai_cost_logs_success_idx" ON "ai_cost_logs"("success");

CREATE INDEX "ai_budget_alerts_date_idx" ON "ai_budget_alerts"("date");
CREATE INDEX "ai_budget_alerts_severity_idx" ON "ai_budget_alerts"("severity");
CREATE INDEX "ai_budget_alerts_alertSent_idx" ON "ai_budget_alerts"("alertSent");

-- Grant Permissions
GRANT ALL ON "ai_cost_logs" TO connect;
GRANT ALL ON "ai_budget_alerts" TO connect;

-- Verify Tables Created
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_cost_logs', 'ai_budget_alerts');

-- Success Message
DO $$
BEGIN
  RAISE NOTICE '✅ AI Cost Tracking tables created successfully';
  RAISE NOTICE '   - ai_cost_logs';
  RAISE NOTICE '   - ai_budget_alerts';
  RAISE NOTICE '   - All indexes created';
  RAISE NOTICE '   - Foreign keys configured';
END $$;
