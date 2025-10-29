/**
 * Check Description for Business Structure Keywords
 *
 * Searches program descriptions for business structure keywords
 * to verify if the data exists but the parser is failing to extract it.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUSINESS_KEYWORDS = [
  '법인사업자',
  '법인만',
  '법인에 한함',
  '법인사업자만',
  '법인기업',
  '법인 한정',
  '주식회사',
  '유한회사',
  '개인사업자 제외',
  '개인사업자 불가',
  '법인만 가능',
  '개인 제외',
  '1인 사업자 허용',
  '개인사업자 가능',
  '법인 또는 개인',
  '법인 및 개인',
];

async function checkDescriptionForBusinessKeywords() {
  console.log('🔍 Searching Descriptions for Business Structure Keywords\n');
  console.log('='.repeat(80));

  // Get all programs with descriptions
  const programs = await prisma.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
    },
    select: {
      id: true,
      title: true,
      description: true,
      allowedBusinessStructures: true,
    },
  });

  console.log(`\n📊 Total Programs: ${programs.length}\n`);
  console.log('─'.repeat(80));

  let programsWithKeywords = 0;
  let programsExtracted = 0;

  programs.forEach((program, index) => {
    if (!program.description) {
      console.log(`\n${index + 1}. ${program.title.substring(0, 80)}...`);
      console.log(`   ⚠️ No description available`);
      return;
    }

    const foundKeywords: string[] = [];
    BUSINESS_KEYWORDS.forEach(keyword => {
      if (program.description!.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    });

    if (foundKeywords.length > 0) {
      programsWithKeywords++;
      console.log(`\n${index + 1}. ${program.title.substring(0, 80)}...`);
      console.log(`   ✅ Found keywords: ${foundKeywords.join(', ')}`);
      console.log(`   Extracted: ${JSON.stringify(program.allowedBusinessStructures)}`);

      if (program.allowedBusinessStructures.length === 0) {
        console.log(`   ❌ PARSER FAILED - Keywords found but not extracted!`);
      } else {
        programsExtracted++;
        console.log(`   ✅ Successfully extracted!`);
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Results Summary:\n');
  console.log(`Total programs: ${programs.length}`);
  console.log(`Programs with business structure keywords: ${programsWithKeywords}`);
  console.log(`Programs with extracted business structures: ${programsExtracted}`);

  if (programsWithKeywords === 0) {
    console.log('\n✅ CONCLUSION: October 2025 NTIS announcements genuinely have NO business structure restrictions');
    console.log('   This is NORMAL for early announcement phase (restrictions added closer to deadline)');
  } else if (programsWithKeywords > programsExtracted) {
    console.log('\n❌ CONCLUSION: Parser is FAILING to extract business structures from descriptions');
    console.log(`   ${programsWithKeywords - programsExtracted} programs have keywords but were not extracted`);
  } else {
    console.log('\n✅ CONCLUSION: Parser is working correctly!');
  }

  await prisma.$disconnect();
}

checkDescriptionForBusinessKeywords().catch((error) => {
  console.error('❌ Query failed:', error.message);
  process.exit(1);
});
