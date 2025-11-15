/**
 * Debug Script: Test Historical Match Generation
 *
 * Purpose: Reproduce the issue where clicking "View 2025 Reference Projects"
 * doesn't generate historical matches for Innowave organization
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';

const db = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function main() {
  console.log('🔍 Starting Historical Match Generation Debug...\n');

  // Step 1: Verify organization exists and profile is complete
  console.log('Step 1: Checking organization profile...');
  const organizationId = 'a592e75b-9049-4352-a36c-991642cd4672'; // Innowave

  const organization = await db.organizations.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    console.error('❌ Organization not found!');
    return;
  }

  console.log('✅ Organization found:', organization.name);
  console.log('   Type:', organization.type);
  console.log('   Industry:', organization.industrySector);
  console.log('   TRL:', organization.technologyReadinessLevel);
  console.log('   Profile Complete:', organization.profileCompleted);
  console.log('   R&D Experience:', organization.rdExperience);

  if (!organization.profileCompleted) {
    console.error('❌ Profile not complete!');
    return;
  }

  // Step 2: Query for EXPIRED programs (matching API filter)
  console.log('\nStep 2: Querying EXPIRED programs...');
  const programs = await db.funding_programs.findMany({
    where: {
      status: ProgramStatus.EXPIRED,
      announcementType: AnnouncementType.R_D_PROJECT,
      scrapingSource: {
        not: null,
        notIn: ['NTIS_API'],
      },
    },
    orderBy: [
      { publishedAt: 'desc' },
      { deadline: 'desc' },
    ],
  });

  console.log('✅ Found', programs.length, 'EXPIRED R&D programs');

  if (programs.length === 0) {
    console.error('❌ No EXPIRED programs available!');
    return;
  }

  // Show sample programs
  console.log('\n   Sample programs:');
  programs.slice(0, 5).forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.title.substring(0, 60)}...`);
    console.log(`      Agency: ${p.agencyId}, Status: ${p.status}, Source: ${p.scrapingSource}`);
  });

  // Step 3: Test matching algorithm
  console.log('\nStep 3: Testing matching algorithm...');

  // Import matching algorithm
  const { generateMatches } = await import('../lib/matching/algorithm');

  const matchResults = generateMatches(
    organization,
    programs,
    10,
    { includeExpired: true }
  );

  console.log('✅ Generated', matchResults.length, 'matches');

  if (matchResults.length === 0) {
    console.log('\n❌ No matches generated!');
    console.log('\n🔍 Debugging why no matches...');

    // Test with first program manually
    const testProgram = programs[0];
    console.log('\n   Testing first program:', testProgram.title.substring(0, 60));
    console.log('   Target Type:', testProgram.targetType);
    console.log('   Organization Type:', organization.type);
    console.log('   Does target include org type?', testProgram.targetType?.includes(organization.type));

    return;
  }

  // Show top matches
  console.log('\n   Top matches:');
  matchResults.slice(0, 5).forEach((match, idx) => {
    console.log(`   ${idx + 1}. Score ${match.score} - ${match.program.title.substring(0, 60)}...`);
    console.log(`      Agency: ${match.program.agencyId}`);
  });

  // Step 4: Test saving to database
  console.log('\nStep 4: Testing database save (UPSERT)...');

  const firstMatch = matchResults[0];

  // Import explanation generator
  const { generateExplanation } = await import('../lib/matching/explainer');

  const explanation = generateExplanation(
    firstMatch,
    organization,
    firstMatch.program
  );

  const savedMatch = await db.funding_matches.upsert({
    where: {
      organizationId_programId: {
        organizationId: organization.id,
        programId: firstMatch.program.id,
      },
    },
    update: {
      score: firstMatch.score,
      explanation: explanation as any,
    },
    create: {
      organizationId: organization.id,
      programId: firstMatch.program.id,
      score: firstMatch.score,
      explanation: explanation as any,
    },
  });

  console.log('✅ Successfully saved match:', savedMatch.id);

  // Step 5: Verify saved matches
  console.log('\nStep 5: Verifying saved matches in database...');
  const savedMatches = await db.funding_matches.findMany({
    where: { organizationId },
    include: {
      funding_programs: true,
    },
  });

  console.log('✅ Total matches in database:', savedMatches.length);

  console.log('\n✅ All tests passed! Historical match generation should work.');
}

main()
  .catch((error) => {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
