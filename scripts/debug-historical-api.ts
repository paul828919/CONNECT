/**
 * Debug Historical Matching API
 *
 * Traces the EXACT flow when button is clicked to identify where the issue occurs
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function debugHistoricalAPI() {
  console.log('🔍 Debugging Historical Matching API\n');
  console.log('='.repeat(70));

  const orgId = 'e81e467f-a84c-4a8d-ac57-b7527913c695'; // Innowave

  try {
    // STEP 1: Fetch organization (exactly what API does)
    console.log('\n📋 STEP 1: Fetching organization...');
    const organization = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      console.log('❌ BLOCKER: Organization not found');
      return;
    }

    console.log(`✅ Found: ${organization.name}`);
    console.log(`   Type: ${organization.type}`);
    console.log(`   TRL: ${organization.technologyReadinessLevel}`);
    console.log(`   Industry: ${organization.industrySector}`);

    // STEP 2: Fetch EXPIRED programs (exactly what API does)
    console.log('\n📊 STEP 2: Fetching EXPIRED programs...');
    const programs = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
      take: 100,
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'desc' },
      ],
    });

    console.log(`✅ Found ${programs.length} EXPIRED programs`);

    if (programs.length === 0) {
      console.log('❌ BLOCKER: No EXPIRED programs in database');
      return;
    }

    // STEP 3: Test algorithm WITH includeExpired option
    console.log('\n🧪 STEP 3: Testing algorithm with includeExpired: true...');
    console.log('   This is EXACTLY what /api/matches/historical/generate does\n');

    const matchResults = generateMatches(
      organization,
      programs,
      10,
      { includeExpired: true } // KEY: This should trigger relaxed filters
    );

    console.log(`✅ Algorithm returned: ${matchResults.length} matches`);

    if (matchResults.length === 0) {
      console.log('\n❌ CRITICAL FAILURE: Algorithm still returning 0 matches!');
      console.log('   This means the code changes are NOT being used.\n');
      console.log('   Possible causes:');
      console.log('   1. Dev server using cached/old code (needs restart)');
      console.log('   2. TypeScript not recompiled (needs manual build)');
      console.log('   3. Logic error in implementation');
      console.log('\n   Debugging first program:');

      const firstProgram = programs[0];
      console.log(`   Title: ${firstProgram.title.substring(0, 60)}...`);
      console.log(`   Target Type: ${firstProgram.targetType?.join(', ') || 'ANY'}`);
      console.log(`   TRL Range: ${firstProgram.minTrl} - ${firstProgram.maxTrl}`);
      console.log(`   Category: ${firstProgram.category}`);

      // Test filter logic manually
      console.log('\n   Manual Filter Test:');

      // Type filter check
      const typeMatch = !firstProgram.targetType || firstProgram.targetType.includes(organization.type);
      console.log(`   ├─ Type: ${typeMatch ? '✅ PASS' : '❌ FAIL'} (${organization.type} vs ${firstProgram.targetType?.join('|') || 'ANY'})`);

      // TRL filter check (with relaxation)
      if (firstProgram.minTrl && firstProgram.maxTrl && organization.technologyReadinessLevel) {
        const relaxedMin = Math.max(1, firstProgram.minTrl - 3);
        const relaxedMax = Math.min(9, firstProgram.maxTrl + 3);
        const trlMatch = organization.technologyReadinessLevel >= relaxedMin &&
                         organization.technologyReadinessLevel <= relaxedMax;
        console.log(`   ├─ TRL: ${trlMatch ? '✅ PASS' : '❌ FAIL'} (${organization.technologyReadinessLevel} vs relaxed ${relaxedMin}-${relaxedMax})`);
      }

      return;
    }

    // Show match details
    console.log('\n✅ SUCCESS: Matches generated!');
    console.log('   Top 5 matches:');
    matchResults.slice(0, 5).forEach((match, idx) => {
      console.log(`   ${idx + 1}. Score: ${match.score} - ${match.program.title.substring(0, 60)}...`);
    });

    // STEP 4: Check if matches exist in database
    console.log('\n💾 STEP 4: Checking database for existing matches...');
    const existingMatches = await db.funding_matches.findMany({
      where: {
        organizationId: orgId,
        funding_programs: {
          status: ProgramStatus.EXPIRED,
        },
      },
      include: {
        funding_programs: true,
      },
    });

    console.log(`✅ Found ${existingMatches.length} matches in database`);

    if (existingMatches.length === 0) {
      console.log('   ⚠️  Database is empty - matches need to be saved first');
      console.log('   User must click button to trigger generation API');
    }

    // STEP 5: Verify what API would return
    console.log('\n🌐 STEP 5: Simulating API response...');
    console.log(`   GET /api/matches/historical?organizationId=${orgId}`);
    console.log(`   Would return: ${existingMatches.length} matches`);
    console.log(`   UI condition: showHistorical && historicalMatches.length > 0`);
    console.log(`   Would display: ${existingMatches.length > 0 ? '✅ YES' : '❌ NO'}`);

    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNOSIS SUMMARY\n');

    if (matchResults.length > 0) {
      console.log('✅ Algorithm: WORKING (generating matches)');

      if (existingMatches.length > 0) {
        console.log('✅ Database: POPULATED (matches saved)');
        console.log('✅ UI: SHOULD DISPLAY\n');
        console.log('If UI still shows empty, possible causes:');
        console.log('1. Frontend using stale state (page needs refresh)');
        console.log('2. API call failing (check Network tab in browser)');
        console.log('3. Session/auth issue (user not logged in correctly)');
      } else {
        console.log('⚠️  Database: EMPTY (matches not saved yet)');
        console.log('🔧 User must click button to trigger generation\n');
      }
    } else {
      console.log('❌ Algorithm: BROKEN (returning 0 matches)');
      console.log('❌ Database: N/A (cannot save 0 matches)');
      console.log('❌ UI: CANNOT DISPLAY\n');
      console.log('ROOT CAUSE: Code changes not reflected in running server');
      console.log('FIX: Restart dev server to load updated algorithm.ts');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

debugHistoricalAPI();
