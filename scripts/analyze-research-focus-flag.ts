/**
 * Analyze Research Focus Flag Distribution
 *
 * This script investigates which programs have researchInstituteFocus=true
 * to understand if our filter is too broad.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('RESEARCH FOCUS FLAG ANALYSIS');
  console.log('========================================\n');

  const allPrograms = await db.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      title: true,
      targetType: true,
      eligibilityCriteria: true,
    },
  });

  console.log(`Total active programs: ${allPrograms.length}\n`);

  const programsWithResearchFocus = allPrograms.filter((p) => {
    const criteria = p.eligibilityCriteria as any;
    return criteria && criteria.researchInstituteFocus === true;
  });

  console.log(`Programs with researchInstituteFocus=true: ${programsWithResearchFocus.length}`);
  console.log(`Percentage: ${((programsWithResearchFocus.length / allPrograms.length) * 100).toFixed(1)}%\n`);

  console.log('TARGET TYPE BREAKDOWN FOR PROGRAMS WITH RESEARCH FOCUS:');
  console.log('-------------------------------------------------------');

  const targetTypeCounts: Record<string, number> = {};

  for (const program of programsWithResearchFocus) {
    const targetTypeKey = JSON.stringify(program.targetType || []);
    targetTypeCounts[targetTypeKey] = (targetTypeCounts[targetTypeKey] || 0) + 1;
  }

  Object.entries(targetTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([targetType, count]) => {
      console.log(`  ${targetType}: ${count} programs`);
    });

  console.log('\n\nSAMPLE PROGRAMS WITH RESEARCH FOCUS:');
  console.log('-----------------------------------');

  // Show first 10 programs with researchFocus
  programsWithResearchFocus.slice(0, 10).forEach((program, index) => {
    console.log(`\n${index + 1}. ${program.title.substring(0, 80)}...`);
    console.log(`   Target Type: ${JSON.stringify(program.targetType)}`);
    const criteria = program.eligibilityCriteria as any;
    console.log(`   SME Eligible: ${criteria.smeEligible}`);
    console.log(`   Organization Requirements: ${JSON.stringify(criteria.organizationRequirements)}`);
  });

  console.log('\n\n========================================');
  console.log('ANALYSIS SUMMARY');
  console.log('========================================\n');

  console.log('🔍 FINDINGS:');
  console.log('If majority of programs have researchInstituteFocus=true, the flag may be:');
  console.log('  1. Too broadly applied during extraction');
  console.log('  2. Or it might mean "includes research institutes" not "ONLY research institutes"');
  console.log('\n💡 SOLUTION:');
  console.log('  Use a more specific condition to filter hospital/medical-only programs:');
  console.log('  - Check for BOTH researchInstituteFocus=true AND specific keywords');
  console.log('  - Keywords: "의사과학자", "상급종합병원", "의료법", "M.D.-Ph.D."');
  console.log('  - Or check if targetType excludes COMPANY (empty or RESEARCH_INSTITUTE only)');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
