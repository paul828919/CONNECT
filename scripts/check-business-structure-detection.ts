/**
 * Check Business Structure Detection
 *
 * Investigates why 0% of programs have business structure restrictions.
 * Checks if the parser is failing or if October 2025 NTIS announcements genuinely have no restrictions.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBusinessStructureDetection() {
  console.log('🔍 Investigating Business Structure Detection\n');
  console.log('='.repeat(80));

  // Get all programs with their full details
  const programs = await prisma.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
    },
    select: {
      id: true,
      title: true,
      description: true,
      eligibilityCriteria: true,
      allowedBusinessStructures: true,
      announcementUrl: true,
    },
    take: 5,
  });

  console.log(`\n📊 Total Programs: ${programs.length}\n`);
  console.log('─'.repeat(80));

  programs.forEach((program, index) => {
    console.log(`\n${index + 1}. ${program.title.substring(0, 100)}...`);
    console.log(`   Business Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);
    console.log(`   URL: ${program.announcementUrl}`);

    // Check eligibility criteria for business structure keywords
    if (program.eligibilityCriteria) {
      const eligibilityStr = JSON.stringify(program.eligibilityCriteria).toLowerCase();
      const hasCorpKeyword =
        eligibilityStr.includes('법인') ||
        eligibilityStr.includes('기업') ||
        eligibilityStr.includes('중소기업') ||
        eligibilityStr.includes('개인사업자') ||
        eligibilityStr.includes('1인 사업자');

      if (hasCorpKeyword) {
        console.log(`   ⚠️ Eligibility contains business structure keywords!`);
        console.log(`   Eligibility data: ${JSON.stringify(program.eligibilityCriteria).substring(0, 300)}...`);
      } else {
        console.log(`   ℹ️ No obvious business structure keywords in eligibility`);
        console.log(`   Eligibility data: ${JSON.stringify(program.eligibilityCriteria).substring(0, 200)}...`);
      }
    } else {
      console.log(`   ⚠️ No eligibility criteria extracted`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Analysis Summary:\n');

  const withEligibility = programs.filter(p => p.eligibilityCriteria !== null).length;
  const withBusinessStructures = programs.filter(p => p.allowedBusinessStructures.length > 0).length;

  console.log(`Programs with eligibility criteria: ${withEligibility}/${programs.length} (${(withEligibility/programs.length*100).toFixed(1)}%)`);
  console.log(`Programs with business structure restrictions: ${withBusinessStructures}/${programs.length} (${(withBusinessStructures/programs.length*100).toFixed(1)}%)`);

  if (withEligibility > 0 && withBusinessStructures === 0) {
    console.log('\n⚠️ HYPOTHESIS: Parser may be failing to extract business structure restrictions from eligibility text');
  } else if (withEligibility === 0) {
    console.log('\n⚠️ HYPOTHESIS: Scraper may be failing to extract eligibility criteria from NTIS announcements');
  }

  await prisma.$disconnect();
}

checkBusinessStructureDetection().catch((error) => {
  console.error('❌ Query failed:', error.message);
  process.exit(1);
});
