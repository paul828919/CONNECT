/**
 * Test Historical Match Generation Flow
 *
 * Simulates the complete button click flow to identify failure point
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';

const db = new PrismaClient({ log: ['error', 'warn'] });

async function testHistoricalMatchFlow() {
  console.log('🧪 Testing Historical Match Generation Flow\n');
  console.log('='.repeat(60));

  try {
    // Use real organization from database
    const orgId = '0563febf-ded4-43fb-88d6-e90642a89745'; // GreenTech Solutions

    console.log('\n1️⃣  Fetching organization profile...');
    const organization = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      console.log('❌ Organization not found!');
      return;
    }

    console.log(`✅ Found: ${organization.name}`);
    console.log(`   Type: ${organization.type}`);
    console.log(`   Sector: ${organization.industrySector}`);
    console.log(`   Profile Complete: ${organization.profileCompleted}`);

    if (!organization.profileCompleted) {
      console.log('❌ BLOCKER: Profile not complete!');
      return;
    }

    console.log('\n2️⃣  Fetching EXPIRED programs...');
    const programs = await db.funding_programs.findMany({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
      take: 100, // Get more programs for testing
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'desc' },
      ],
    });

    console.log(`✅ Found ${programs.length} EXPIRED programs`);
    console.log(`   Sample: ${programs[0]?.title.substring(0, 60)}...`);

    if (programs.length === 0) {
      console.log('❌ BLOCKER: No EXPIRED programs found!');
      return;
    }

    console.log('\n3️⃣  Generating matches with algorithm...');
    const matchResults = generateMatches(
      organization,
      programs,
      10, // Generate up to 10 matches
      { includeExpired: true } // KEY: Enable expired program matching
    );

    console.log(`✅ Generated ${matchResults.length} matches`);

    if (matchResults.length === 0) {
      console.log('❌ BLOCKER: Algorithm returned 0 matches!');
      console.log('   This means none of the programs matched the organization profile.');
      console.log('   Check if the matching algorithm is working correctly.');
      return;
    }

    // Show top 3 matches
    console.log('\n   Top 3 matches:');
    matchResults.slice(0, 3).forEach((match, idx) => {
      console.log(`   ${idx + 1}. Score: ${match.score} - ${match.program.title.substring(0, 50)}...`);
    });

    console.log('\n4️⃣  Generating explanations...');
    const firstMatch = matchResults[0];
    const explanation = generateExplanation(
      firstMatch,
      organization,
      firstMatch.program
    );

    console.log(`✅ Generated explanation for first match`);
    console.log(`   Explanation keys: ${Object.keys(explanation).join(', ')}`);

    console.log('\n5️⃣  Saving matches to database...');

    let savedCount = 0;
    let errors = [];

    for (const matchResult of matchResults) {
      try {
        const explanation = generateExplanation(
          matchResult,
          organization,
          matchResult.program
        );

        await db.funding_matches.upsert({
          where: {
            organizationId_programId: {
              organizationId: organization.id,
              programId: matchResult.program.id,
            },
          },
          update: {
            score: matchResult.score,
            explanation: explanation as any,
          },
          create: {
            organizationId: organization.id,
            programId: matchResult.program.id,
            score: matchResult.score,
            explanation: explanation as any,
          },
        });

        savedCount++;
      } catch (err: any) {
        errors.push({
          program: matchResult.program.title.substring(0, 40),
          error: err.message
        });
      }
    }

    console.log(`✅ Saved ${savedCount}/${matchResults.length} matches to database`);

    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errors encountered:`);
      errors.forEach((e, idx) => {
        console.log(`   ${idx + 1}. ${e.program}: ${e.error}`);
      });
    }

    console.log('\n6️⃣  Verifying saved matches...');
    const savedMatches = await db.funding_matches.findMany({
      where: {
        organizationId: organization.id,
        funding_programs: {
          status: ProgramStatus.EXPIRED,
        },
      },
      include: {
        funding_programs: true,
      },
    });

    console.log(`✅ Database now contains ${savedMatches.length} historical matches`);

    if (savedMatches.length > 0) {
      console.log('\n   Sample matches in database:');
      savedMatches.slice(0, 3).forEach((match, idx) => {
        console.log(`   ${idx + 1}. ${match.funding_programs.title.substring(0, 50)}... (Score: ${match.score})`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS: Historical match flow completed!');
    console.log(`   Generated: ${matchResults.length} matches`);
    console.log(`   Saved: ${savedCount} matches`);
    console.log(`   In Database: ${savedMatches.length} matches`);
    console.log('\n💡 User can now click "View 2025 Reference Projects" to see results.');

  } catch (error: any) {
    console.error('\n❌ ERROR in match flow:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

testHistoricalMatchFlow();
