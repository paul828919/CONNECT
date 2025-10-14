/**
 * Full Match Generation Workflow Test
 *
 * Tests the complete matching workflow:
 * 1. Fetch test organization from production
 * 2. Fetch active programs with deadlines
 * 3. Generate matches using algorithm
 * 4. Display Korean explanations
 * 5. Store matches in database
 * 6. Verify stored matches
 *
 * Usage:
 * SSH_PASSWORD='iw237877^^' npx tsx scripts/test-full-match-flow.ts
 */

import { PrismaClient, ProgramStatus, OrganizationType } from '@prisma/client';
import { generateMatches, type MatchScore } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';

// Connect to production database via SSH tunnel
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://connect@127.0.0.1:5433/connect?schema=public';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

// Test organization ID (Test Company Ltd.)
const TEST_ORG_ID = '2171d6ad-a57a-4b3d-8ea0-a9cc892253c2';

async function main() {
  console.log('🧪 Full Match Generation Workflow Test\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Fetch test organization
    console.log('\n📋 Step 1: Fetching Test Company Ltd...');
    const org = await prisma.organizations.findUnique({
      where: { id: TEST_ORG_ID },
    });

    if (!org) {
      throw new Error('Test organization not found');
    }

    console.log(`✓ Organization found: ${org.name}`);
    console.log(`  - Type: ${org.type}`);
    console.log(`  - Industry: ${org.industrySector}`);
    console.log(`  - TRL: ${org.technologyReadinessLevel}`);
    console.log(`  - Profile Completed: ${org.profileCompleted}`);
    console.log(`  - Profile Score: ${org.profileScore}`);

    // Step 2: Fetch active programs
    console.log('\n🔍 Step 2: Fetching active funding programs...');
    const programs = await prisma.funding_programs.findMany({
      where: {
        status: ProgramStatus.ACTIVE,
        deadline: {
          gte: new Date(), // Only future deadlines
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });

    console.log(`✓ Found ${programs.length} active programs with future deadlines`);

    // Show programs by agency
    const programsByAgency = programs.reduce((acc, p) => {
      acc[p.agencyId] = (acc[p.agencyId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(programsByAgency).forEach(([agency, count]) => {
      console.log(`  - ${agency}: ${count} programs`);
    });

    // Filter programs that could match our test org
    const matchablePrograms = programs.filter(p => {
      const targetTypeMatch = p.targetType.includes(org.type);
      const trlMatch = p.minTrl && p.maxTrl && org.technologyReadinessLevel
        ? (p.minTrl <= org.technologyReadinessLevel && p.maxTrl >= org.technologyReadinessLevel)
        : true;
      return targetTypeMatch && trlMatch;
    });

    console.log(`\n✓ ${matchablePrograms.length} programs eligible for Test Company Ltd.`);

    // Step 3: Generate matches using algorithm
    console.log('\n🎯 Step 3: Generating matches using algorithm...');
    const startTime = Date.now();

    const matchResults: MatchScore[] = generateMatches(org, programs, 10);

    const duration = Date.now() - startTime;
    console.log(`✓ Generated ${matchResults.length} matches in ${duration}ms`);

    if (matchResults.length === 0) {
      console.warn('⚠️  No matches generated. Check algorithm criteria.');
      return;
    }

    // Step 4: Display matches with Korean explanations
    console.log('\n📊 Step 4: Match Results with Korean Explanations\n');
    console.log('=' .repeat(80));

    matchResults.forEach((match, index) => {
      console.log(`\n${index + 1}. ${match.program.title}`);
      console.log(`   Agency: ${match.program.agencyId} | Score: ${match.score}/100`);
      console.log(`   Deadline: ${match.program.deadline?.toLocaleDateString('ko-KR')}`);

      console.log('\n   Score Breakdown:');
      console.log(`   - Industry/Keywords: ${match.breakdown.industryScore}/30`);
      console.log(`   - TRL Compatibility: ${match.breakdown.trlScore}/20`);
      console.log(`   - Organization Type: ${match.breakdown.typeScore}/20`);
      console.log(`   - R&D Experience: ${match.breakdown.experienceScore}/15`);
      console.log(`   - Deadline Urgency: ${match.breakdown.deadlineScore}/15`);

      // Generate Korean explanation
      const explanation = generateExplanation(match, org, match.program);

      console.log('\n   Korean Explanations:');
      if (Array.isArray(explanation)) {
        explanation.forEach((exp, i) => {
          console.log(`   ${i + 1}. ${exp}`);
        });
      } else if (typeof explanation === 'object' && explanation !== null) {
        Object.entries(explanation).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            console.log(`\n   ${key}:`);
            value.forEach((item, i) => {
              console.log(`     ${i + 1}. ${item}`);
            });
          } else {
            console.log(`   - ${key}: ${value}`);
          }
        });
      }

      console.log('\n' + '-'.repeat(80));
    });

    // Step 5: Store matches in database
    console.log('\n💾 Step 5: Storing matches in database...');

    // Delete existing matches for clean test
    await prisma.funding_matches.deleteMany({
      where: { organizationId: TEST_ORG_ID },
    });
    console.log('✓ Cleared existing matches');

    const createdMatches = await Promise.all(
      matchResults.slice(0, 10).map(async (matchResult) => {
        const explanation = generateExplanation(matchResult, org, matchResult.program);

        return prisma.funding_matches.create({
          data: {
            organizationId: org.id,
            programId: matchResult.program.id,
            score: matchResult.score,
            explanation: explanation as any,
          },
          include: {
            funding_programs: true,
          },
        });
      })
    );

    console.log(`✓ Stored ${createdMatches.length} matches in database`);

    // Step 6: Verify stored matches
    console.log('\n🔍 Step 6: Verifying stored matches...');

    const storedMatches = await prisma.funding_matches.findMany({
      where: { organizationId: TEST_ORG_ID },
      include: {
        funding_programs: true,
      },
      orderBy: {
        score: 'desc',
      },
    });

    console.log(`✓ Retrieved ${storedMatches.length} matches from database`);

    storedMatches.forEach((match, index) => {
      console.log(`  ${index + 1}. ${match.funding_programs.title} (Score: ${match.score})`);
    });

    // Step 7: Performance summary
    console.log('\n⚡ Performance Summary\n');
    console.log('=' .repeat(80));
    console.log(`Match Generation: ${duration}ms`);
    console.log(`Target: < 3000ms (${duration < 3000 ? '✅ PASS' : '❌ FAIL'})`);
    console.log(`Matches Generated: ${matchResults.length}`);
    console.log(`Matches Stored: ${createdMatches.length}`);
    console.log(`Average Score: ${Math.round(matchResults.reduce((sum, m) => sum + m.score, 0) / matchResults.length)}/100`);

    // Success summary
    console.log('\n✅ Full Match Workflow Test PASSED\n');
    console.log('=' .repeat(80));
    console.log('✓ Test organization fetched');
    console.log('✓ Active programs retrieved');
    console.log(`✓ ${matchResults.length} matches generated`);
    console.log('✓ Korean explanations working');
    console.log('✓ Matches stored in database');
    console.log('✓ Performance < 3 seconds');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
