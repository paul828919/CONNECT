-- ============================================================================
-- Post-Migration SQL for Ranking Metrics Infrastructure
-- ============================================================================
-- This script must be run OUTSIDE Prisma migrations because:
-- 1. CREATE INDEX CONCURRENTLY cannot run inside a transaction
-- 2. NOT VALID constraints need separate VALIDATE step
--
-- Run with: psql $DATABASE_URL -f scripts/post-migration-ranking-metrics.sql
-- Or via node script: scripts/apply-ranking-metrics-constraints.ts
-- ============================================================================

-- ============================================================================
-- Phase 1: Pre-Migration Checks
-- ============================================================================

-- Check for duplicate (session_id, program_id) in sme_program_matches
-- If duplicates exist, resolve before adding unique constraint
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT session_id, program_id
        FROM sme_program_matches
        WHERE session_id IS NOT NULL
        GROUP BY session_id, program_id
        HAVING COUNT(*) > 1
    ) dups;

    IF dup_count > 0 THEN
        RAISE NOTICE 'Found % duplicate (session_id, program_id) pairs - cleaning up using ctid', dup_count;

        -- Delete duplicates keeping the one with smallest ctid
        DELETE FROM sme_program_matches a
        USING sme_program_matches b
        WHERE a.session_id = b.session_id
          AND a.program_id = b.program_id
          AND a.session_id IS NOT NULL
          AND a.ctid < b.ctid;

        RAISE NOTICE 'Cleanup complete';
    ELSE
        RAISE NOTICE 'No duplicates found in sme_program_matches';
    END IF;
END
$$;

-- ============================================================================
-- Phase 2: Composite FK for Same-Org Validation (sme_match_sessions)
-- ============================================================================

-- Add unique constraint for composite FK (needed for FK reference)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_sme_sessions_id_org'
    ) THEN
        ALTER TABLE sme_match_sessions
        ADD CONSTRAINT uq_sme_sessions_id_org UNIQUE (id, organization_id);
        RAISE NOTICE 'Added uq_sme_sessions_id_org unique constraint';
    ELSE
        RAISE NOTICE 'uq_sme_sessions_id_org already exists';
    END IF;
END
$$;

-- Add composite FK ensuring source_session_id references same org
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_sme_sessions_source_same_org'
    ) THEN
        ALTER TABLE sme_match_sessions
        ADD CONSTRAINT fk_sme_sessions_source_same_org
        FOREIGN KEY (source_session_id, organization_id)
        REFERENCES sme_match_sessions (id, organization_id);
        RAISE NOTICE 'Added fk_sme_sessions_source_same_org composite FK';
    ELSE
        RAISE NOTICE 'fk_sme_sessions_source_same_org already exists';
    END IF;
END
$$;

-- ============================================================================
-- Phase 3: Position CHECK Constraint (NOT VALID pattern)
-- ============================================================================

-- Step 1: Add CHECK without validation (fast, no table scan)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_position_1_based'
    ) THEN
        ALTER TABLE sme_program_matches
        ADD CONSTRAINT chk_position_1_based CHECK (position >= 1) NOT VALID;
        RAISE NOTICE 'Added chk_position_1_based CHECK constraint (NOT VALID)';
    ELSE
        RAISE NOTICE 'chk_position_1_based already exists';
    END IF;
END
$$;

-- ============================================================================
-- Phase 4: Create Indexes CONCURRENTLY
-- ============================================================================
-- Note: These cannot run inside a transaction, so run this file without -1 flag

-- Index for session org+time queries (session lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sme_sessions_org_created
ON sme_match_sessions (organization_id, created_at);

-- Index for SAVE events attribution (fallback path)
-- Partial index: only SAVE events, for attribution SQL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rec_events_save_org_program_time
ON recommendation_events (organization_id, program_id, occurred_at)
WHERE event_type = 'SAVE';

-- Index for SAVE events with sme_session_id (direct attribution path)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rec_events_save_sme_session_time
ON recommendation_events (sme_session_id, occurred_at)
WHERE event_type = 'SAVE' AND sme_session_id IS NOT NULL;

-- Index for match lookups by session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sme_matches_session_program
ON sme_program_matches (session_id, program_id)
WHERE session_id IS NOT NULL;

-- Covering index for match queries (avoids table lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sme_matches_session_cover
ON sme_program_matches (session_id) INCLUDE (program_id, position)
WHERE session_id IS NOT NULL;

-- ============================================================================
-- Phase 5: Validate CHECK Constraint (after indexes created)
-- ============================================================================

-- Validate the position constraint (can be slow on large tables)
-- Run during maintenance window if table is large
DO $$
BEGIN
    -- Check if constraint exists and is not valid
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'chk_position_1_based'
          AND t.relname = 'sme_program_matches'
          AND NOT c.convalidated
    ) THEN
        ALTER TABLE sme_program_matches
        VALIDATE CONSTRAINT chk_position_1_based;
        RAISE NOTICE 'Validated chk_position_1_based CHECK constraint';
    ELSE
        RAISE NOTICE 'chk_position_1_based is already validated or does not exist';
    END IF;
END
$$;

-- ============================================================================
-- Phase 6: Verification
-- ============================================================================

-- Show created constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    CASE WHEN c.convalidated THEN 'validated' ELSE 'not validated' END as status
FROM information_schema.table_constraints tc
JOIN pg_constraint c ON c.conname = tc.constraint_name
WHERE tc.table_name IN ('sme_match_sessions', 'sme_program_matches', 'ranking_quality_metrics')
  AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type;

-- Show created indexes
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('sme_match_sessions', 'sme_program_matches', 'recommendation_events')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

RAISE NOTICE '✅ Post-migration script completed successfully';
