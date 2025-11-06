import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

async function main() {
  const prog = await prisma.funding_programs.findFirst({
    where: { title: { contains: '2025년 사용후 배터리 안전관리' } },
    select: {
      title: true,
      budgetAmount: true,
      scraping_job: { select: { detailPageData: true } },
    },
  });

  if (!prog) {
    console.log('Program not found');
    return;
  }

  const data = prog.scraping_job?.detailPageData as any;
  const rawHtml = data?.rawHtml || '';

  console.log('Program:', prog.title.substring(0, 80));
  console.log('Stored budget:', Number(prog.budgetAmount) / 100_000_000, '억원');
  console.log('');

  // Search for the actual extraction that would return 25억원
  console.log('Searching for budget patterns in rawHtml...\n');

  // Pattern 1: Direct 25억원
  if (rawHtml.includes('25억원')) {
    console.log('✓ Found "25억원" in HTML');
    const idx = rawHtml.indexOf('25억원');
    const start = Math.max(0, idx - 150);
    const end = Math.min(rawHtml.length, idx + 150);
    console.log('Context:', rawHtml.slice(start, end).replace(/\s+/g, ' ').trim());
    console.log('');
  }

  // Pattern 2: 25,000백만원
  if (rawHtml.includes('25,000백만원') || rawHtml.includes('25000백만원')) {
    console.log('✓ Found "25,000백만원" pattern in HTML');
  }

  // Find ALL 억원 mentions
  console.log('\nAll 억원 mentions in HTML (non-zero amounts):');
  console.log('-'.repeat(80));

  const billionPattern = /(\d[\d,\.]*)\s*억원/g;
  const matches = [...rawHtml.matchAll(billionPattern)];

  const nonZeroMatches = matches.filter((match) => {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    return amount > 0 && amount < 200;
  });

  console.log(`Found ${nonZeroMatches.length} non-zero 억원 mentions:\n`);

  for (let i = 0; i < Math.min(15, nonZeroMatches.length); i++) {
    const match = nonZeroMatches[i];
    const amount = parseFloat(match[1].replace(/,/g, ''));
    console.log(`${i + 1}. ${match[0]} (${amount}억원)`);

    if (amount === 25) {
      // Found it! Get context
      const idx = rawHtml.indexOf(match[0]);
      const start = Math.max(0, idx - 200);
      const end = Math.min(rawHtml.length, idx + 200);
      console.log('   >>> THIS MATCHES STORED BUDGET! Context:');
      console.log('   ' + rawHtml.slice(start, end).replace(/\s+/g, ' ').trim().substring(0, 150) + '...');
    }
  }

  console.log('\n' + '='.repeat(80));
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
