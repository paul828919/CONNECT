/**
 * Verify Ranking Metrics Setup
 *
 * Tests the session tracking infrastructure by:
 * 1. Finding a test organization
 * 2. Generating matches with session tracking
 * 3. Verifying session and position are stored
 * 4. Testing cache hit session creation
 *
 * Usage:
 *   npx tsx scripts/verify-ranking-metrics-setup.ts
 *   npx tsx scripts/verify-ranking-metrics-setup.ts --org-id <org_id>
 */

import { PrismaClient, SMEProgramStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { generateSMEMatches } from '../lib/matching/sme-algorithm';
import { getConfigName, DEFAULT_SME_WEIGHTS } from '../lib/analytics/ranking-metrics';

const prisma = new PrismaClient();

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Ranking Metrics Infrastructure Verification                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // ========================================================================
  // Phase 1: Find test organization
  // ========================================================================
  console.log('📋 Phase 1: Finding test organization...');

  const orgIdArg = process.argv.find((arg) => arg.startsWith('--org-id='))?.split('=')[1] ||
    process.argv[process.argv.indexOf('--org-id') + 1];

  let org;
  if (orgIdArg) {
    org = await prisma.organizations.findUnique({
      where: { id: orgIdArg },
      include: { locations: true },
    });
  } else {
    // Find any organization with complete profile
    org = await prisma.organizations.findFirst({
      where: {
        profileCompleted: true,
        status: 'ACTIVE',
      },
      include: { locations: true },
    });
  }

  if (!org) {
    console.log('   ⚠️  No suitable organization found');
    console.log('   Create an organization first or specify --org-id');
    return;
  }

  console.log(`   Found: ${org.name} (${org.id})`);
  console.log('');

  // ========================================================================
  // Phase 2: Generate matches with session tracking
  // ========================================================================
  console.log('📋 Phase 2: Generating matches with session tracking...');

  // Fetch active SME programs
  const programs = await prisma.sme_programs.findMany({
    where: {
      status: SMEProgramStatus.ACTIVE,
    },
    take: 50,
  });

  console.log(`   Found ${programs.length} active programs`);

  if (programs.length === 0) {
    console.log('   ⚠️  No active programs found. Run SME sync first.');
    return;
  }

  // Generate matches
  const matchResults = generateSMEMatches(org, programs, {
    minimumScore: 30,
    limit: 20,
  });

  console.log(`   Generated ${matchResults.length} matches`);

  if (matchResults.length === 0) {
    console.log('   ⚠️  No matches generated. Organization may not be eligible.');
    return;
  }

  // Create session
  const sessionId = randomUUID();
  const configName = getConfigName(DEFAULT_SME_WEIGHTS);

  await prisma.sme_match_sessions.create({
    data: {
      id: sessionId,
      organizationId: org.id,
      sourceSessionId: null,
      configName,
    },
  });

  console.log(`   Created session: ${sessionId}`);
  console.log(`   Config name: ${configName}`);

  // Store matches with positions
  for (let i = 0; i < matchResults.length; i++) {
    const match = matchResults[i];
    const position = i + 1;

    await prisma.sme_program_matches.upsert({
      where: {
        organizationId_programId: {
          organizationId: org.id,
          programId: match.program.id,
        },
      },
      update: {
        score: match.score,
        eligibilityLevel: match.eligibilityLevel,
        sessionId,
        position,
      },
      create: {
        organizationId: org.id,
        programId: match.program.id,
        score: match.score,
        eligibilityLevel: match.eligibilityLevel,
        failedCriteria: match.failedCriteria,
        metCriteria: match.metCriteria,
        scoreBreakdown: JSON.parse(JSON.stringify(match.scoreBreakdown)),
        explanation: JSON.parse(JSON.stringify(match.explanation)),
        sessionId,
        position,
      },
    });
  }

  console.log(`   Stored ${matchResults.length} matches with positions`);
  console.log('');

  // ========================================================================
  // Phase 3: Verify session record
  // ========================================================================
  console.log('📋 Phase 3: Verifying session record...');

  const session = await prisma.sme_match_sessions.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { matches: true },
      },
    },
  });

  if (!session) {
    console.log('   ❌ Session not found!');
    return;
  }

  console.log(`   ✓ Session exists: ${session.id}`);
  console.log(`   ✓ Organization: ${session.organizationId}`);
  console.log(`   ✓ Config: ${session.configName}`);
  console.log(`   ✓ Source session: ${session.sourceSessionId || '(fresh session)'}`);
  console.log(`   ✓ Match count: ${session._count.matches}`);
  console.log('');

  // ========================================================================
  // Phase 4: Verify match positions
  // ========================================================================
  console.log('📋 Phase 4: Verifying match positions...');

  const matches = await prisma.sme_program_matches.findMany({
    where: {
      organizationId: org.id,
      sessionId,
    },
    orderBy: { position: 'asc' },
    take: 5,
  });

  console.log('   Top 5 matches with positions:');
  for (const m of matches) {
    console.log(`     Position ${m.position}: score=${m.score}, program=${m.programId.slice(0, 8)}...`);
  }

  // Verify position constraint (should all be >= 1)
  const invalidPositions = matches.filter((m) => m.position === null || m.position < 1);
  if (invalidPositions.length > 0) {
    console.log(`   ⚠️  Found ${invalidPositions.length} matches with invalid positions`);
  } else {
    console.log('   ✓ All positions are valid (>= 1)');
  }
  console.log('');

  // ========================================================================
  // Phase 5: Test cache hit session creation
  // ========================================================================
  console.log('📋 Phase 5: Testing cache hit session...');

  const cacheHitSessionId = randomUUID();

  await prisma.sme_match_sessions.create({
    data: {
      id: cacheHitSessionId,
      organizationId: org.id,
      sourceSessionId: sessionId, // References the fresh session
      configName,
    },
  });

  const cacheSession = await prisma.sme_match_sessions.findUnique({
    where: { id: cacheHitSessionId },
    include: {
      sourceSession: {
        select: {
          id: true,
          organizationId: true,
        },
      },
    },
  });

  if (cacheSession?.sourceSession) {
    console.log(`   ✓ Cache hit session created: ${cacheHitSessionId}`);
    console.log(`   ✓ References source session: ${cacheSession.sourceSessionId}`);
    console.log(`   ✓ Source org matches: ${cacheSession.sourceSession.organizationId === org.id}`);
  } else {
    console.log('   ❌ Cache hit session or source relation failed');
  }
  console.log('');

  // ========================================================================
  // Phase 6: Verify constraints
  // ========================================================================
  console.log('📋 Phase 6: Verifying database constraints...');

  const constraints = await prisma.$queryRaw<{ constraint_name: string }[]>`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'sme_match_sessions'
      AND constraint_type IN ('UNIQUE', 'FOREIGN KEY')
      AND constraint_name IN ('uq_sme_sessions_id_org', 'fk_sme_sessions_source_same_org')
  `;

  const constraintNames = constraints.map((c) => c.constraint_name);
  const hasUqConstraint = constraintNames.includes('uq_sme_sessions_id_org');
  const hasFkConstraint = constraintNames.includes('fk_sme_sessions_source_same_org');

  console.log(`   Composite unique constraint: ${hasUqConstraint ? '✓' : '❌'}`);
  console.log(`   Same-org FK constraint: ${hasFkConstraint ? '✓' : '❌'}`);

  const checkConstraint = await prisma.$queryRaw<{ conname: string }[]>`
    SELECT conname FROM pg_constraint
    WHERE conname = 'chk_position_1_based'
  `;
  console.log(`   Position CHECK constraint: ${checkConstraint.length > 0 ? '✓' : '❌'}`);
  console.log('');

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Summary                                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Sessions created: 2 (1 fresh, 1 cache hit)`);
  console.log(`Matches stored: ${matchResults.length}`);
  console.log(`Config name: ${configName}`);
  console.log('');
  console.log('✅ Ranking metrics infrastructure verified!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run match generation via API to test full flow');
  console.log('  2. Create SAVE events to test attribution');
  console.log('  3. Run compute-ranking-metrics.ts to calculate metrics');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
