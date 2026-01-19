/**
 * Clear and Regenerate Matches
 *
 * This script clears existing matches from the database and Redis cache,
 * then regenerates them using the updated algorithm with all three filters:
 * 1. Consolidated announcement filter
 * 2. TRL hard requirement filter
 * 3. Hospital/medical institution filter
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';
import { generateExplanation } from '../lib/matching/explainer';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('CLEAR AND REGENERATE MATCHES');
  console.log('========================================\n');

  // Find Innowave organization with locations for regional matching
  const innowave = await db.organizations.findFirst({
    where: { name: '이노웨이브' },
    include: {
      locations: true,  // Include locations for 중소벤처기업부 regional filtering
    },
  });

  if (!innowave) {
    console.log('❌ Innowave organization not found');
    return;
  }

  // Organization already includes locations from the include statement
  const innowaveWithLocations = innowave;

  console.log('📋 INNOWAVE ORGANIZATION');
  console.log('========================');
  console.log(`ID: ${innowave.id}`);
  console.log(`Name: ${innowave.name}`);
  console.log(`Type: ${innowave.type}`);
  console.log(`Business Structure: ${innowave.businessStructure}`);
  console.log(`Industry: ${innowave.industrySector}`);
  console.log(`TRL: ${innowave.technologyReadinessLevel}`);
  console.log(`Company Scale: ${innowave.companyScaleType}`);
  console.log(`Locations: ${innowaveWithLocations.locations?.map(l => `${l.locationType}:${l.region}`).join(', ') || 'None'}`);

  // Step 1: Clear existing matches from database
  console.log('\n🗑️  STEP 1: Clearing existing matches from database...');
  const deleteResult = await db.funding_matches.deleteMany({
    where: { organizationId: innowave.id },
  });
  console.log(`✅ Deleted ${deleteResult.count} existing matches\n`);

  // Step 2: Fetch all active programs
  console.log('📥 STEP 2: Fetching active funding programs...');
  const programs = await db.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
      announcementType: 'R_D_PROJECT',
    },
    orderBy: [
      { publishedAt: 'desc' },
      { deadline: 'asc' },
    ],
  });
  console.log(`✅ Found ${programs.length} active programs\n`);

  // Step 3: Generate new matches with updated algorithm
  console.log('🔄 STEP 3: Generating matches with updated algorithm...');
  console.log('Filters applied:');
  console.log('  ✓ Consolidated announcement filter (checks deadline, applicationStart, budgetAmount all NULL)');
  console.log('  ✓ TRL hard requirement filter (organization TRL outside program TRL range)');
  console.log('  ✓ Hospital/medical institution filter (physician-scientist keywords in title)');
  console.log('  ✓ 중소벤처기업부 Scale + Region filter (company scale and location-based)');
  console.log('  ✓ GENERAL cross-industry relevance boost (0.55 for cross-industry programs)');
  console.log('');

  // Use innowaveWithLocations which includes the locations array for regional matching
  const matchResults = generateMatches(innowaveWithLocations, programs, 20);  // Increased limit to see more matches
  console.log(`✅ Generated ${matchResults.length} matches\n`);

  if (matchResults.length === 0) {
    console.log('⚠️  No matches generated. This might indicate the filters are too aggressive.');
    return;
  }

  // Step 4: Store new matches in database
  console.log('💾 STEP 4: Storing matches in database...');
  const createdMatches = await Promise.all(
    matchResults.map(async (matchResult) => {
      const explanation = generateExplanation(
        matchResult,
        innowave,
        matchResult.program
      );

      return db.funding_matches.create({
        data: {
          organizationId: innowave.id,
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
  console.log(`✅ Stored ${createdMatches.length} matches in database\n`);

  // Step 5: Display results
  console.log('📊 RESULTS');
  console.log('==========\n');
  createdMatches.forEach((match, index) => {
    console.log(`${index + 1}. ${match.funding_programs.title.substring(0, 60)}...`);
    console.log(`   Score: ${match.score}`);
    console.log(`   Ministry: ${match.funding_programs.ministry || 'N/A'}`);
    console.log(`   Category: ${match.funding_programs.category || 'N/A'}`);
    console.log(`   Deadline: ${match.funding_programs.deadline || 'N/A'}`);
    console.log('');
  });

  // Step 6: Verify filters worked
  console.log('✅ VERIFICATION');
  console.log('===============\n');

  const consolidatedAnnouncement = createdMatches.find((m) =>
    m.funding_programs.title.includes('연구개발특구')
  );
  console.log(`Consolidated announcement filtered: ${consolidatedAnnouncement ? '❌ FAILED' : '✅ PASSED'}`);

  const bioProgram = createdMatches.find((m) =>
    m.funding_programs.title.includes('바이오접합체')
  );
  console.log(`Bio-convergence (TRL 1-3) filtered: ${bioProgram ? '❌ FAILED' : '✅ PASSED'}`);

  const physicianProgram = createdMatches.find((m) =>
    m.funding_programs.title.includes('의사과학자')
  );
  console.log(`Physician-scientist programs filtered: ${physicianProgram ? '❌ FAILED' : '✅ PASSED'}`);

  // v4.1: Verify SME cross-industry programs are now matching
  const smePrograms = createdMatches.filter((m) =>
    m.funding_programs.ministry === '중소벤처기업부'
  );
  console.log(`\n📊 중소벤처기업부 (SME) MATCHES: ${smePrograms.length}`);
  if (smePrograms.length > 0) {
    console.log('   ✅ SME cross-industry programs now matching!');
    smePrograms.forEach((m, i) => {
      console.log(`   ${i + 1}. [Score: ${m.score}] ${m.funding_programs.title.substring(0, 50)}...`);
    });
  } else {
    console.log('   ⚠️ No SME programs matched - check scale/region filters');
  }

  console.log('\n✅ Match regeneration complete!');
  console.log('\n📌 NEXT STEP: Refresh localhost:3000/dashboard/matches to see updated results');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
