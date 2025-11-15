/**
 * Verify Filter Relaxation for Option B
 *
 * Tests that TRL and Type filters are properly relaxed for EXPIRED programs
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient({ log: ['error', 'warn'] });

async function verifyFilterRelaxation() {
  console.log('🔬 Verifying Filter Relaxation (Option B)\n');
  console.log('='.repeat(70));

  const orgId = 'e81e467f-a84c-4a8d-ac57-b7527913c695'; // Innowave

  try {
    // Fetch organization
    const organization = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      console.log('❌ Organization not found!');
      return;
    }

    console.log(`\n📋 Organization: ${organization.name}`);
    console.log(`   Type: ${organization.type}`);
    console.log(`   TRL: ${organization.technologyReadinessLevel}`);

    // Fetch EXPIRED programs
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

    console.log(`\n📊 Testing ${programs.length} EXPIRED programs\n`);

    // TEST 1: STRICT filters (includeExpired: false)
    console.log('TEST 1: Strict Filters (includeExpired: false)');
    const strictMatches = generateMatches(
      organization,
      programs,
      100, // High limit to see all matches
      { includeExpired: false }
    );
    console.log(`✅ Result: ${strictMatches.length} matches`);
    console.log(`   Pass rate: ${((strictMatches.length / programs.length) * 100).toFixed(1)}%\n`);

    // TEST 2: RELAXED filters (includeExpired: true) - Option B
    console.log('TEST 2: Relaxed Filters (includeExpired: true) - OPTION B');
    const relaxedMatches = generateMatches(
      organization,
      programs,
      100, // High limit to see all matches
      { includeExpired: true }
    );
    console.log(`✅ Result: ${relaxedMatches.length} matches`);
    console.log(`   Pass rate: ${((relaxedMatches.length / programs.length) * 100).toFixed(1)}%\n`);

    // ANALYSIS
    console.log('='.repeat(70));
    console.log('📈 COMPARISON\n');
    console.log(`Strict filtering:  ${strictMatches.length} matches (${((strictMatches.length / programs.length) * 100).toFixed(1)}%)`);
    console.log(`Relaxed filtering: ${relaxedMatches.length} matches (${((relaxedMatches.length / programs.length) * 100).toFixed(1)}%)`);
    console.log(`\nImprovement: +${relaxedMatches.length - strictMatches.length} matches (+${(((relaxedMatches.length - strictMatches.length) / programs.length) * 100).toFixed(1)}%)\n`);

    if (relaxedMatches.length > strictMatches.length) {
      console.log('✅ SUCCESS: Filter relaxation is working!');
      console.log(`   Expected: 40-50 matches (40-50% pass rate)`);
      console.log(`   Actual: ${relaxedMatches.length} matches (${((relaxedMatches.length / programs.length) * 100).toFixed(1)}% pass rate)`);

      if (relaxedMatches.length >= 40) {
        console.log('\n🎉 EXCELLENT: Achieved target match count!');
      } else if (relaxedMatches.length >= 20) {
        console.log('\n✓ GOOD: Significant improvement, approaching target');
      } else {
        console.log('\n⚠️  MODERATE: Some improvement, but below target');
      }
    } else {
      console.log('❌ FAILURE: Filter relaxation NOT working!');
      console.log('   Possible causes:');
      console.log('   1. Code changes not reflected (TypeScript compilation issue)');
      console.log('   2. Logic error in conditional filter application');
      console.log('   3. Other filters still blocking matches');
    }

    // Show sample matches
    if (relaxedMatches.length > 0) {
      console.log('\n📋 Sample relaxed matches (top 5):');
      relaxedMatches.slice(0, 5).forEach((match, idx) => {
        console.log(`   ${idx + 1}. Score: ${match.score} - ${match.program.title.substring(0, 60)}...`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

verifyFilterRelaxation();
