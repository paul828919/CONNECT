/**
 * Apply Ranking Metrics Constraints
 *
 * This script applies the post-migration SQL for ranking metrics infrastructure.
 * It must be run separately from Prisma migrations because:
 * 1. CREATE INDEX CONCURRENTLY cannot run inside a transaction
 * 2. Composite FK and CHECK constraints need special handling
 *
 * Usage:
 *   npx tsx scripts/apply-ranking-metrics-constraints.ts
 *   npx tsx scripts/apply-ranking-metrics-constraints.ts --dry-run
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Ranking Metrics Post-Migration Constraints                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('');

  // Phase 1: Check for duplicates
  console.log('📋 Phase 1: Checking for duplicates...');
  const duplicates = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM (
      SELECT "sessionId", "programId"
      FROM sme_program_matches
      WHERE "sessionId" IS NOT NULL
      GROUP BY "sessionId", "programId"
      HAVING COUNT(*) > 1
    ) dups
  `;
  const dupCount = Number(duplicates[0]?.count || 0);

  if (dupCount > 0) {
    console.log(`   ⚠️  Found ${dupCount} duplicate (sessionId, programId) pairs`);
    if (!isDryRun) {
      await prisma.$executeRaw`
        DELETE FROM sme_program_matches a
        USING sme_program_matches b
        WHERE a."sessionId" = b."sessionId"
          AND a."programId" = b."programId"
          AND a."sessionId" IS NOT NULL
          AND a.ctid < b.ctid
      `;
      console.log('   ✓ Cleaned up duplicates using ctid');
    }
  } else {
    console.log('   ✓ No duplicates found');
  }
  console.log('');

  // Phase 2: Composite FK
  console.log('📋 Phase 2: Adding composite FK for same-org validation...');

  // Check if unique constraint exists
  const uqExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'uq_sme_sessions_id_org'
    ) as exists
  `;

  if (!uqExists[0]?.exists) {
    if (!isDryRun) {
      await prisma.$executeRaw`
        ALTER TABLE sme_match_sessions
        ADD CONSTRAINT uq_sme_sessions_id_org UNIQUE (id, "organizationId")
      `;
      console.log('   ✓ Added uq_sme_sessions_id_org unique constraint');
    } else {
      console.log('   [DRY RUN] Would add uq_sme_sessions_id_org');
    }
  } else {
    console.log('   ✓ uq_sme_sessions_id_org already exists');
  }

  // Check if FK exists
  const fkExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'fk_sme_sessions_source_same_org'
    ) as exists
  `;

  if (!fkExists[0]?.exists) {
    if (!isDryRun) {
      await prisma.$executeRaw`
        ALTER TABLE sme_match_sessions
        ADD CONSTRAINT fk_sme_sessions_source_same_org
        FOREIGN KEY (source_session_id, "organizationId")
        REFERENCES sme_match_sessions (id, "organizationId")
      `;
      console.log('   ✓ Added fk_sme_sessions_source_same_org composite FK');
    } else {
      console.log('   [DRY RUN] Would add fk_sme_sessions_source_same_org');
    }
  } else {
    console.log('   ✓ fk_sme_sessions_source_same_org already exists');
  }
  console.log('');

  // Phase 3: Position CHECK constraint
  console.log('📋 Phase 3: Adding position CHECK constraint...');

  const chkExists = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'chk_position_1_based'
    ) as exists
  `;

  if (!chkExists[0]?.exists) {
    if (!isDryRun) {
      await prisma.$executeRaw`
        ALTER TABLE sme_program_matches
        ADD CONSTRAINT chk_position_1_based CHECK (position >= 1) NOT VALID
      `;
      console.log('   ✓ Added chk_position_1_based (NOT VALID)');
    } else {
      console.log('   [DRY RUN] Would add chk_position_1_based');
    }
  } else {
    console.log('   ✓ chk_position_1_based already exists');
  }
  console.log('');

  // Phase 4: Create indexes (these run CONCURRENTLY via raw SQL)
  console.log('📋 Phase 4: Creating indexes CONCURRENTLY...');
  console.log('   Note: CONCURRENTLY indexes cannot use Prisma transactions');

  const indexes = [
    {
      name: 'idx_sme_sessions_org_created',
      table: 'sme_match_sessions',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sme_sessions_org_created
            ON sme_match_sessions ("organizationId", created_at)`,
    },
    {
      name: 'idx_rec_events_save_org_program_time',
      table: 'recommendation_events',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rec_events_save_org_program_time
            ON recommendation_events ("organizationId", "programId", "occurredAt")
            WHERE "eventType" = 'SAVE'`,
    },
    {
      name: 'idx_rec_events_save_sme_session_time',
      table: 'recommendation_events',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rec_events_save_sme_session_time
            ON recommendation_events (sme_session_id, "occurredAt")
            WHERE "eventType" = 'SAVE' AND sme_session_id IS NOT NULL`,
    },
    {
      name: 'idx_sme_matches_session_program',
      table: 'sme_program_matches',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sme_matches_session_program
            ON sme_program_matches ("sessionId", "programId")
            WHERE "sessionId" IS NOT NULL`,
    },
    {
      name: 'idx_sme_matches_session_cover',
      table: 'sme_program_matches',
      sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sme_matches_session_cover
            ON sme_program_matches ("sessionId") INCLUDE ("programId", position)
            WHERE "sessionId" IS NOT NULL`,
    },
  ];

  for (const idx of indexes) {
    const idxExists = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = ${idx.name}
      ) as exists
    `;

    if (!idxExists[0]?.exists) {
      if (!isDryRun) {
        // CONCURRENTLY cannot run in a transaction, use raw connection
        await prisma.$executeRawUnsafe(idx.sql);
        console.log(`   ✓ Created ${idx.name}`);
      } else {
        console.log(`   [DRY RUN] Would create ${idx.name}`);
      }
    } else {
      console.log(`   ✓ ${idx.name} already exists`);
    }
  }
  console.log('');

  // Phase 5: Validate CHECK constraint
  console.log('📋 Phase 5: Validating CHECK constraint...');

  const needsValidation = await prisma.$queryRaw<{ needs_validation: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE c.conname = 'chk_position_1_based'
        AND t.relname = 'sme_program_matches'
        AND NOT c.convalidated
    ) as needs_validation
  `;

  if (needsValidation[0]?.needs_validation) {
    if (!isDryRun) {
      await prisma.$executeRaw`
        ALTER TABLE sme_program_matches
        VALIDATE CONSTRAINT chk_position_1_based
      `;
      console.log('   ✓ Validated chk_position_1_based');
    } else {
      console.log('   [DRY RUN] Would validate chk_position_1_based');
    }
  } else {
    console.log('   ✓ chk_position_1_based is already validated');
  }
  console.log('');

  // Phase 6: Summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Summary                                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Count constraints
  const constraints = await prisma.$queryRaw<{ constraint_name: string; constraint_type: string }[]>`
    SELECT tc.constraint_name, tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_name IN ('sme_match_sessions', 'sme_program_matches')
      AND tc.constraint_type IN ('CHECK', 'FOREIGN KEY', 'UNIQUE')
      AND tc.constraint_name IN (
        'uq_sme_sessions_id_org',
        'fk_sme_sessions_source_same_org',
        'chk_position_1_based'
      )
  `;

  console.log(`Constraints applied: ${constraints.length}/3`);
  for (const c of constraints) {
    console.log(`  • ${c.constraint_name} (${c.constraint_type})`);
  }

  // Count indexes
  const indexCount = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM pg_indexes
    WHERE indexname IN (
      'idx_sme_sessions_org_created',
      'idx_rec_events_save_org_program_time',
      'idx_rec_events_save_sme_session_time',
      'idx_sme_matches_session_program',
      'idx_sme_matches_session_cover'
    )
  `;

  console.log(`Indexes created: ${indexCount[0]?.count}/5`);
  console.log('');

  if (isDryRun) {
    console.log('🔍 This was a dry run. No changes were made.');
    console.log('   Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Post-migration script completed successfully!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
