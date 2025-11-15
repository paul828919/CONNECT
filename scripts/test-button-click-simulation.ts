/**
 * Button Click Simulation Test
 *
 * Simulates the exact flow when user clicks "2025년 참고용 과제 보기" button
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';

const db = new PrismaClient({ log: ['error', 'warn'] });

async function simulateButtonClick() {
  console.log('🖱️  Simulating Button Click Flow\n');
  console.log('='.repeat(70));

  const orgId = '0563febf-ded4-43fb-88d6-e90642a89745'; // GreenTech Solutions

  try {
    // STEP 1: Clear existing historical matches (simulate fresh click)
    console.log('\n1️⃣  CLEARING existing historical matches...');
    const deleted = await db.funding_matches.deleteMany({
      where: {
        organizationId: orgId,
        funding_programs: {
          status: ProgramStatus.EXPIRED,
        },
      },
    });
    console.log(`✅ Deleted ${deleted.count} existing matches`);

    // STEP 2: Fetch organization (what the API does)
    console.log('\n2️⃣  FETCHING organization profile...');
    const organization = await db.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      console.log('❌ BLOCKER: Organization not found!');
      return;
    }

    console.log(`✅ Found: ${organization.name}`);
    console.log(`   TRL: ${organization.technologyReadinessLevel}`);
    console.log(`   Sector: ${organization.industrySector}`);

    // STEP 3: Fetch EXPIRED programs (what the API does)
    console.log('\n3️⃣  FETCHING EXPIRED programs...');
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
      console.log('❌ BLOCKER: No EXPIRED programs in database!');
      return;
    }

    // STEP 4: Generate matches (what the API does)
    console.log('\n4️⃣  GENERATING matches with algorithm...');
    const matchResults = generateMatches(
      organization,
      programs,
      10,
      { includeExpired: true }
    );

    console.log(`✅ Algorithm returned ${matchResults.length} matches`);

    if (matchResults.length === 0) {
      console.log('❌ CRITICAL: Algorithm generated 0 matches!');
      console.log('\n💡 This is the ROOT CAUSE:');
      console.log('   The matching algorithm is too strict - all programs were filtered out.');
      console.log('   User will see empty results even though button click succeeded.');
      return;
    }

    // Show top matches
    console.log('\n   Top matches:');
    matchResults.forEach((match, idx) => {
      console.log(`   ${idx + 1}. Score: ${match.score} - ${match.program.title.substring(0, 60)}...`);
    });

    // STEP 5: Save matches to database (what the API does)
    console.log('\n5️⃣  SAVING matches to database...');
    let savedCount = 0;

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
        console.error(`   ❌ Failed to save match: ${err.message}`);
      }
    }

    console.log(`✅ Saved ${savedCount}/${matchResults.length} matches`);

    if (savedCount === 0) {
      console.log('❌ BLOCKER: Failed to save any matches to database!');
      return;
    }

    // STEP 6: Fetch historical matches (what the UI does after button click)
    console.log('\n6️⃣  FETCHING historical matches (UI step)...');
    const historicalMatches = await db.funding_matches.findMany({
      where: {
        organizationId: orgId,
        funding_programs: {
          status: ProgramStatus.EXPIRED,
          announcementType: AnnouncementType.R_D_PROJECT,
          scrapingSource: {
            not: null,
            notIn: ['NTIS_API'],
          },
        },
      },
      include: {
        funding_programs: true,
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    console.log(`✅ UI would receive ${historicalMatches.length} matches`);

    // STEP 7: Verify UI display logic
    console.log('\n7️⃣  VERIFYING UI display logic...');
    const showHistorical = true; // Set by button click callback
    const shouldDisplay = showHistorical && historicalMatches.length > 0;

    if (shouldDisplay) {
      console.log('✅ UI WOULD DISPLAY RESULTS');
      console.log('\n   Matches to display:');
      historicalMatches.slice(0, 3).forEach((match, idx) => {
        console.log(`   ${idx + 1}. ${match.funding_programs.title.substring(0, 60)}... (Score: ${match.score})`);
      });
    } else {
      console.log('❌ UI WOULD NOT DISPLAY RESULTS');
      console.log(`   showHistorical: ${showHistorical}`);
      console.log(`   historicalMatches.length: ${historicalMatches.length}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 FINAL VERDICT\n');

    if (shouldDisplay) {
      console.log('✅ BUTTON CLICK FLOW WORKS CORRECTLY');
      console.log(`   Generated: ${matchResults.length} matches`);
      console.log(`   Saved: ${savedCount} matches`);
      console.log(`   Displayed: ${historicalMatches.length} matches`);
      console.log('\n💡 If user reports empty results, possible causes:');
      console.log('   1. User clicked before local server fully started');
      console.log('   2. Network/session issue preventing API call');
      console.log('   3. Frontend JavaScript error (check browser console)');
    } else {
      console.log('❌ BUTTON CLICK FLOW HAS ISSUES');
      console.log(`   Generated: ${matchResults.length} matches`);
      console.log(`   Saved: ${savedCount} matches`);
      console.log(`   Displayed: 0 matches (BUG!)`)      ;
    }

  } catch (error: any) {
    console.error('\n❌ ERROR in button click flow:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

simulateButtonClick();
