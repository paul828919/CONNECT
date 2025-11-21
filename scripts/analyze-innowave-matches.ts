/**
 * Analyze Historical Matches for Innowave (Kim Byungjin)
 *
 * Verifies TRL ±3 relaxation and Type filter bypass are working correctly
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function analyzeInnowaveMatches() {
  console.log('📊 Analyzing Historical Matches for Innowave\n');
  console.log('='.repeat(80));

  const orgId = 'e81e467f-a84c-4a8d-ac57-b7527913c695'; // Innowave

  try {
    // 1. Fetch organization profile
    console.log('\n👤 ORGANIZATION PROFILE');
    const org = await db.organizations.findUnique({
      where: { id: orgId },
      include: {
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!org) {
      console.log('❌ Organization not found');
      return;
    }

    console.log(`   Name: ${org.name}`);
    console.log(`   Type: ${org.type}`);
    console.log(`   TRL: ${org.technologyReadinessLevel}`);
    console.log(`   Industry: ${org.industrySector}`);
    console.log(`   Users: ${org.users.map(u => `${u.name} (${u.email})`).join(', ')}`);

    // 2. Fetch historical matches from database
    console.log('\n\n💾 DATABASE MATCHES (Historical Programs)');
    const matches = await db.funding_matches.findMany({
      where: {
        organizationId: orgId,
        funding_programs: {
          status: 'EXPIRED',
        },
      },
      include: {
        funding_programs: true,
      },
      orderBy: {
        score: 'desc',
      },
    });

    console.log(`   Total Matches: ${matches.length}`);

    if (matches.length === 0) {
      console.log('   ⚠️  No matches found in database yet');
      console.log('   This is expected if button was just clicked for the first time');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🔍 DETAILED MATCH ANALYSIS\n');

    // Analyze each match
    matches.forEach((match, idx) => {
      const program = match.funding_programs;

      console.log(`\n[${ idx + 1 }] Score: ${match.score} | ${program.title.substring(0, 60)}...`);
      console.log('─'.repeat(80));

      // Type Filter Analysis
      console.log('\n   📌 TYPE FILTER CHECK:');
      console.log(`      Organization Type: ${org.type}`);
      console.log(`      Program Target: ${program.targetType?.join(', ') || 'ANY (null)'}`);

      if (!program.targetType || program.targetType.length === 0) {
        console.log(`      ✅ MATCH - Program accepts ANY type`);
      } else if (program.targetType.includes(org.type)) {
        console.log(`      ✅ MATCH - Type explicitly allowed`);
      } else {
        console.log(`      ⚠️  BYPASSED - Type filter relaxed for EXPIRED programs`);
        console.log(`      (This is EXPECTED behavior for historical matches)`);
      }

      // TRL Filter Analysis
      console.log('\n   🎯 TRL FILTER CHECK:');
      console.log(`      Organization TRL: ${org.technologyReadinessLevel}`);
      console.log(`      Program TRL Range: ${program.minTrl} - ${program.maxTrl}`);

      if (program.minTrl && program.maxTrl && org.technologyReadinessLevel) {
        // Original filter (strict)
        const strictMatch = org.technologyReadinessLevel >= program.minTrl &&
                           org.technologyReadinessLevel <= program.maxTrl;

        // Relaxed filter (±3)
        const relaxedMin = Math.max(1, program.minTrl - 3);
        const relaxedMax = Math.min(9, program.maxTrl + 3);
        const relaxedMatch = org.technologyReadinessLevel >= relaxedMin &&
                            org.technologyReadinessLevel <= relaxedMax;

        console.log(`      Original Range: ${program.minTrl}-${program.maxTrl} → ${strictMatch ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`      Relaxed Range:  ${relaxedMin}-${relaxedMax} (±3) → ${relaxedMatch ? '✅ PASS' : '❌ FAIL'}`);

        if (!strictMatch && relaxedMatch) {
          console.log(`      ✅ RELAXATION WORKING - Match only possible with ±3 expansion`);
        } else if (strictMatch) {
          console.log(`      ℹ️  Would have matched even without relaxation`);
        } else {
          console.log(`      ❌ SHOULD NOT MATCH - Check algorithm logic!`);
        }
      } else {
        console.log(`      ℹ️  No TRL constraints on program`);
      }

      // Scoring Breakdown
      console.log('\n   📊 SCORING BREAKDOWN:');
      console.log(`      Total Score: ${match.score}`);
      console.log(`      Explanation: ${match.explanation?.substring(0, 100)}...`);

      // Program Metadata
      console.log('\n   📋 PROGRAM METADATA:');
      console.log(`      Ministry: ${program.ministry}`);
      console.log(`      Agency: ${program.agencyId}`);
      console.log(`      Category: ${program.category}`);
      console.log(`      Budget: ${program.budgetAmount ? `₩${Number(program.budgetAmount).toLocaleString()}` : 'N/A'}`);
      console.log(`      Deadline: ${program.deadline ? new Date(program.deadline).toLocaleDateString('ko-KR') : 'N/A'}`);
      console.log(`      Status: ${program.status}`);
    });

    // Summary Statistics
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 SUMMARY STATISTICS\n');

    const typeRelaxationCount = matches.filter(m => {
      const program = m.funding_programs;
      return program.targetType &&
             program.targetType.length > 0 &&
             !program.targetType.includes(org.type);
    }).length;

    const trlRelaxationCount = matches.filter(m => {
      const program = m.funding_programs;
      if (!program.minTrl || !program.maxTrl || !org.technologyReadinessLevel) return false;

      const strictMatch = org.technologyReadinessLevel >= program.minTrl &&
                         org.technologyReadinessLevel <= program.maxTrl;
      const relaxedMin = Math.max(1, program.minTrl - 3);
      const relaxedMax = Math.min(9, program.maxTrl + 3);
      const relaxedMatch = org.technologyReadinessLevel >= relaxedMin &&
                          org.technologyReadinessLevel <= relaxedMax;

      return !strictMatch && relaxedMatch;
    }).length;

    console.log(`   Total Matches: ${matches.length}`);
    console.log(`   Matches Requiring Type Relaxation: ${typeRelaxationCount} (${((typeRelaxationCount / matches.length) * 100).toFixed(1)}%)`);
    console.log(`   Matches Requiring TRL ±3 Relaxation: ${trlRelaxationCount} (${((trlRelaxationCount / matches.length) * 100).toFixed(1)}%)`);
    console.log(`   Average Score: ${(matches.reduce((sum, m) => sum + m.score, 0) / matches.length).toFixed(1)}`);

    // Recommendations
    console.log('\n\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS\n');

    if (trlRelaxationCount > 0) {
      console.log(`   ✅ TRL ±3 Relaxation is WORKING - ${trlRelaxationCount} matches only possible due to expansion`);
    } else {
      console.log(`   ℹ️  All matches passed strict TRL filters - relaxation not needed for this org`);
    }

    if (typeRelaxationCount > 0) {
      console.log(`   ✅ Type Filter Bypass is WORKING - ${typeRelaxationCount} matches only possible due to bypass`);
    } else {
      console.log(`   ℹ️  All matches passed type filters - bypass not needed for this org`);
    }

    if (matches.length < 5) {
      console.log(`   ⚠️  LOW MATCH COUNT (${matches.length}) - Consider further relaxing filters or expanding program database`);
    } else if (matches.length >= 10) {
      console.log(`   ✅ GOOD MATCH COUNT (${matches.length}) - Relaxation strategy is effective`);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

analyzeInnowaveMatches();
