import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

async function main() {
  console.log('='.repeat(100));
  console.log('INVESTIGATION: Why Did Initial Extraction Miss These Patterns?');
  console.log('='.repeat(100));

  // Get the specific program that showed budget in body text
  const prog = await prisma.funding_programs.findFirst({
    where: {
      title: { contains: '2025년 사용후 배터리 안전관리' },
    },
    select: {
      id: true,
      title: true,
      budgetAmount: true,
      scraping_job: {
        select: {
          detailPageData: true,
        },
      },
    },
  });

  if (!prog) {
    console.log('Program not found!');
    return;
  }

  const data = prog.scraping_job?.detailPageData as any;
  const rawHtml = data?.rawHtml || '';

  console.log('\nProgram:', prog.title.substring(0, 80));
  console.log('Budget:', Number(prog.budgetAmount) / 100_000_000, '억원');
  console.log('\nSearching for budget patterns in rawHtml...\n');

  // Search for the specific pattern we saw: "19,000백만원"
  const pattern1 = /19,000백만원/g;
  const pattern2 = /2,400백만원/g;

  const match1 = rawHtml.match(pattern1);
  const match2 = rawHtml.match(pattern2);

  console.log('Pattern "19,000백만원" found in rawHtml:', match1 ? 'YES' : 'NO');
  console.log('Pattern "2,400백만원" found in rawHtml:', match2 ? 'YES' : 'NO');

  // Find context around budget
  const idx = rawHtml.indexOf('백만원');
  if (idx !== -1) {
    const start = Math.max(0, idx - 300);
    const end = Math.min(rawHtml.length, idx + 300);
    console.log('\nHTML context around first "백만원" occurrence:');
    console.log('-'.repeat(100));
    console.log(rawHtml.slice(start, end));
    console.log('-'.repeat(100));
  }

  // Now test if current extraction function would match
  const FIELD_SYNONYMS = {
    budget: [
      '예산',
      '지원규모',
      '지원예산',
      '지원금액',
      '지원한도',
      '사업비',
      '총사업비',
      '총연구비',
      '연구비',
      '과제당',
      '정부출연금',
      '지원금',
      '연구개발비',
      '총연구개발비',
      '과제당지원금',
      '지원총액',
      '총지원금',
      '총지원액',
      '과제지원금',
    ],
  };

  console.log('\n\nTesting current regex patterns...\n');

  // Test Pattern 2: Millions
  for (const synonym of FIELD_SYNONYMS.budget) {
    const millionPattern = new RegExp(`${synonym}[^\\d]*([\\d,\\.]+)\\s*백만원`, 'i');
    const millionMatch = rawHtml.match(millionPattern);
    if (millionMatch) {
      console.log(`✓ MATCH with synonym "${synonym}":`, millionMatch[0]);
      console.log(`  Extracted number: ${millionMatch[1]}`);
      const amount = parseFloat(millionMatch[1].replace(/,/g, ''));
      console.log(`  Parsed amount: ${amount} million KRW = ${amount / 1000} 억원`);
      break; // Found one
    }
  }

  // Check if this pattern would have matched during initial scraping
  console.log('\n\nHypothesis Testing:');
  console.log('-'.repeat(100));
  console.log('\nQ: Why did initial extraction fail for this program?');
  console.log('\nPossible reasons:');
  console.log('1. Attachment text was prioritized, and bodyText was not checked');
  console.log('2. Extraction order issue (checked "0 억원" first, stopped early)');
  console.log('3. Different regex was used during initial scraping');
  console.log('4. HTML structure changed between scraping and re-extraction');

  // Let's check if there's a "0 억원" pattern that would terminate early
  const zeroPattern = /공고금액[^\d]*0\s*억원/i;
  const hasZero = zeroPattern.test(rawHtml);

  console.log('\n\nCritical Finding:');
  console.log('-'.repeat(100));
  if (hasZero) {
    console.log('❌ rawHtml contains "공고금액 : 0 억원" pattern');
    console.log('   Initial extraction likely matched this FIRST and stopped.');
    console.log('   Re-extraction continued checking other patterns after rejecting zero.');
  } else {
    console.log('✅ rawHtml does NOT contain "공고금액 : 0 억원" pattern');
    console.log('   Initial extraction failure is due to different reason.');
  }

  console.log('\n' + '='.repeat(100));
  console.log('END OF INVESTIGATION');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error running investigation:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
