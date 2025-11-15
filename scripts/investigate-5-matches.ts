/**
 * Investigate the 5 Programs That Were Matching
 *
 * This script examines the actual data for the programs that matched
 * BEFORE the researchInstituteFocus filter to understand what makes
 * physician-scientist programs different from legitimate matches.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('INVESTIGATING THE 5 MATCHED PROGRAMS');
  console.log('========================================\n');

  // Get all active programs
  const allPrograms = await db.funding_programs.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      title: true,
      targetType: true,
      deadline: true,
      applicationStart: true,
      budgetAmount: true,
      minTrl: true,
      maxTrl: true,
      allowedBusinessStructures: true,
      requiredCertifications: true,
      eligibilityCriteria: true,
    },
  });

  console.log(`Total active programs: ${allPrograms.length}\n`);

  // Find the specific programs mentioned in test output
  const programTitles = [
    '2026년 농업연구개발사업 1차공모_(2026)농업빅데이터활용모델및인공지능개발',
    '2026년 농업연구개발사업 1차공모_(2026)국가생명연구자원선진화사업(자유공모)',
    '2025년도 글로벌 의사과학자 양성사업(의사과학자 양성 사무국 운영) 신규지원 대상과제 공고',
    '2025년도 글로벌 의사과학자 양성사업(임상현장 의사과학자 연구 멘토링사업) 신규지원 대상과제 공고',
  ];

  // Find programs that contain these titles (fuzzy match)
  const matchedPrograms = allPrograms.filter((p) =>
    programTitles.some((title) => p.title.includes(title.substring(0, 30)))
  );

  console.log(`Found ${matchedPrograms.length} of the expected programs\n`);

  // Also find any programs with "의사과학자" in title
  const physicianPrograms = allPrograms.filter((p) => p.title.includes('의사과학자'));
  console.log(`Programs with "의사과학자" in title: ${physicianPrograms.length}\n`);

  // Examine each program
  for (const program of [...matchedPrograms, ...physicianPrograms].slice(0, 10)) {
    console.log('\n========================================');
    console.log(`PROGRAM: ${program.title.substring(0, 80)}...`);
    console.log('========================================\n');

    console.log('📋 BASIC INFO');
    console.log('-------------');
    console.log(`Deadline: ${program.deadline || 'NULL'}`);
    console.log(`Application Start: ${program.applicationStart || 'NULL'}`);
    console.log(`Budget: ${program.budgetAmount || 'NULL'}`);
    console.log(`TRL Range: ${program.minTrl || 'NULL'} - ${program.maxTrl || 'NULL'}`);

    console.log('\n🎯 TARGETING');
    console.log('------------');
    console.log(`Target Type: ${JSON.stringify(program.targetType)}`);
    console.log(`Allowed Business Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);
    console.log(`Required Certifications: ${JSON.stringify(program.requiredCertifications)}`);

    console.log('\n📊 ELIGIBILITY CRITERIA (JSONB)');
    console.log('-------------------------------');
    const criteria = program.eligibilityCriteria as any;
    console.log(`researchInstituteFocus: ${criteria?.researchInstituteFocus}`);
    console.log(`smeEligible: ${criteria?.smeEligible}`);
    console.log(`organizationRequirements: ${JSON.stringify(criteria?.organizationRequirements)}`);
    console.log(`Full criteria:
${JSON.stringify(criteria, null, 2)}`);

    // Check for hospital/medical keywords in title
    console.log('\n🏥 HOSPITAL/MEDICAL KEYWORDS IN TITLE');
    console.log('-------------------------------------');
    const hospitalKeywords = ['의사과학자', '상급종합병원', 'M.D.', 'Ph.D.', '의료법', '병원'];
    const foundKeywords = hospitalKeywords.filter((keyword) => program.title.includes(keyword));
    if (foundKeywords.length > 0) {
      console.log(`Found: ${foundKeywords.join(', ')}`);
    } else {
      console.log('None found');
    }

    console.log('\n========================================');
  }

  console.log('\n\n========================================');
  console.log('PATTERN ANALYSIS');
  console.log('========================================\n');

  // Count programs by researchInstituteFocus value
  const withResearchFocus = allPrograms.filter((p) => {
    const criteria = p.eligibilityCriteria as any;
    return criteria?.researchInstituteFocus === true;
  });

  console.log(`Programs with researchInstituteFocus=true: ${withResearchFocus.length} / ${allPrograms.length}`);
  console.log(`Percentage: ${((withResearchFocus.length / allPrograms.length) * 100).toFixed(1)}%\n`);

  // Count programs with physician-scientist keywords
  const withPhysicianKeywords = allPrograms.filter((p) =>
    ['의사과학자', '상급종합병원', 'M.D.-Ph.D.'].some((keyword) => p.title.includes(keyword))
  );

  console.log(
    `Programs with physician-scientist keywords: ${withPhysicianKeywords.length} / ${allPrograms.length}\n`
  );

  console.log('💡 HYPOTHESIS:');
  console.log('If researchInstituteFocus is common but physician keywords are rare,');
  console.log('then we should filter by BOTH researchInstituteFocus AND specific keywords\n');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
