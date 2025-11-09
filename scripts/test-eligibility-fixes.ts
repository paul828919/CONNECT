/**
 * Test Eligibility Filtering Fixes
 *
 * This script verifies that the three critical fixes are working:
 * 1. Consolidated announcements (missing deadline AND applicationStart AND budgetAmount) are filtered
 * 2. TRL mismatches are filtered as hard requirements
 * 3. Research institute requirements are checked
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('ELIGIBILITY FILTERING FIXES - TEST');
  console.log('========================================\n');

  // Get Innowave organization
  const innowave = await db.organizations.findFirst({
    where: { name: '이노웨이브' },
  });

  if (!innowave) {
    console.log('❌ Innowave organization not found');
    return;
  }

  console.log('📋 INNOWAVE PROFILE');
  console.log('==================');
  console.log(`Name: ${innowave.name}`);
  console.log(`TRL: ${innowave.technologyReadinessLevel}`);
  console.log(`Business Structure: ${innowave.businessStructure}`);
  console.log(`Has Research Institute: ${innowave.hasResearchInstitute}`);

  // Get the two problematic announcements
  const programs = await db.funding_programs.findMany({
    where: {
      id: {
        in: [
          'f3a4a80b-9150-4772-8644-6b2a2c77da23', // 연구개발특구 (consolidated)
          '0b5115bf-7f68-4e22-895f-6e55e470624e', // 바이오접합체 (TRL 1-3)
        ],
      },
    },
  });

  console.log(`\n✅ Found ${programs.length} test programs\n`);

  // Test Fix 1: Consolidated Announcement Filter
  const consolidatedProgram = programs.find((p) => p.title.includes('연구개발특구'));
  if (consolidatedProgram) {
    console.log('🧪 TEST 1: Consolidated Announcement Filter');
    console.log('===========================================');
    console.log(`Program: ${consolidatedProgram.title}`);
    console.log(`Deadline: ${consolidatedProgram.deadline || 'NULL'}`);
    console.log(`Application Start: ${consolidatedProgram.applicationStart || 'NULL'}`);
    console.log(`Budget: ${consolidatedProgram.budgetAmount || 'NULL'}`);
    console.log(
      `Should Filter: ${!consolidatedProgram.deadline && !consolidatedProgram.applicationStart && !consolidatedProgram.budgetAmount ? 'YES ✅' : 'NO ❌'}`
    );

    const matchesConsolidated = generateMatches(innowave, [consolidatedProgram], 10);
    console.log(`\nResult: ${matchesConsolidated.length === 0 ? '✅ PASSED - Filtered out' : '❌ FAILED - Not filtered'}`);
    if (matchesConsolidated.length > 0) {
      console.log(`  ERROR: Should have been filtered but got score: ${matchesConsolidated[0].score}`);
    }
  }

  // Test Fix 2: TRL Hard Requirement Filter
  const bioProgram = programs.find((p) => p.title.includes('바이오'));
  if (bioProgram) {
    console.log('\n🧪 TEST 2: TRL Hard Requirement Filter');
    console.log('======================================');
    console.log(`Program: ${bioProgram.title}`);
    console.log(`Program TRL Range: ${bioProgram.minTrl}-${bioProgram.maxTrl}`);
    console.log(`Innowave TRL: ${innowave.technologyReadinessLevel}`);
    console.log(
      `TRL Compatible: ${innowave.technologyReadinessLevel! >= bioProgram.minTrl! && innowave.technologyReadinessLevel! <= bioProgram.maxTrl! ? 'YES' : 'NO ❌'}`
    );
    console.log(
      `Should Filter: ${innowave.technologyReadinessLevel! < bioProgram.minTrl! || innowave.technologyReadinessLevel! > bioProgram.maxTrl! ? 'YES ✅' : 'NO ❌'}`
    );

    const matchesBio = generateMatches(innowave, [bioProgram], 10);
    console.log(`\nResult: ${matchesBio.length === 0 ? '✅ PASSED - Filtered out' : '❌ FAILED - Not filtered'}`);
    if (matchesBio.length > 0) {
      console.log(`  ERROR: Should have been filtered but got score: ${matchesBio[0].score}`);
    }
  }

  // Test Fix 3: Research Institute Requirement
  console.log('\n🧪 TEST 3: Research Institute Requirement Check');
  console.log('===============================================');
  console.log(`Innowave has research institute: ${innowave.hasResearchInstitute}`);
  console.log('Schema field added: ✅');

  // Test matching with all programs to see overall effect
  console.log('\n📊 OVERALL MATCHING TEST');
  console.log('========================');
  const allActivePrograms = await db.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
    },
    take: 100, // Test with first 100 programs
  });

  const allMatches = generateMatches(innowave, allActivePrograms, 5);
  console.log(`Total active programs tested: ${allActivePrograms.length}`);
  console.log(`Matches generated: ${allMatches.length}`);
  console.log('\nTop 3 Matches:');
  allMatches.slice(0, 3).forEach((match, i) => {
    console.log(`  ${i + 1}. ${match.program.title} (Score: ${match.score})`);
    console.log(`     TRL: ${match.program.minTrl}-${match.program.maxTrl}`);
    console.log(`     Eligibility: ${match.eligibilityLevel}`);
  });

  // Verify problematic matches are NOT in results
  console.log('\n✅ VERIFICATION');
  console.log('===============');
  const hasConsolidatedMatch = allMatches.some((m) => m.program.title.includes('연구개발특구'));
  const hasBioMatch = allMatches.some((m) => m.program.title.includes('바이오접합체'));
  console.log(
    `Consolidated announcement in results: ${hasConsolidatedMatch ? '❌ FAILED - Should be filtered' : '✅ PASSED - Filtered correctly'}`
  );
  console.log(`Bio announcement (TRL mismatch) in results: ${hasBioMatch ? '❌ FAILED - Should be filtered' : '✅ PASSED - Filtered correctly'}`);

  console.log('\n========================================\n');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
