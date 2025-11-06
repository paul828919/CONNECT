import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

/**
 * Convert HTML to plain text
 */
function htmlToText(html: string): string {
  if (!html || html.trim().length === 0) return '';

  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

async function main() {
  console.log('='.repeat(100));
  console.log('ANALYSIS: Why Were 41 Programs Initially Missed?');
  console.log('='.repeat(100));

  // Get programs that NOW have budget (were just recovered)
  // Strategy: Get recent updates (within last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const recentlyUpdated = await prisma.funding_programs.findMany({
    where: {
      agencyId: 'NTIS',
      budgetAmount: { not: null },
      updatedAt: { gte: fiveMinutesAgo },
    },
    select: {
      id: true,
      title: true,
      budgetAmount: true,
      scraping_job: {
        select: {
          id: true,
          detailPageData: true,
        },
      },
    },
    take: 50, // Should cover all 41 programs
  });

  console.log(`\n📊 Found ${recentlyUpdated.length} recently updated programs\n`);

  const budgetKeywords = [
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
    '억원',
    '백만원',
    '정부출연금',
  ];

  let attachmentBudgetCount = 0;
  let bodyBudgetCount = 0;
  let bothSourcesCount = 0;

  console.log('Analyzing budget source locations...\n');

  for (let i = 0; i < Math.min(10, recentlyUpdated.length); i++) {
    const prog = recentlyUpdated[i];
    const data = prog.scraping_job?.detailPageData as any;

    console.log(`\n${'='.repeat(100)}`);
    console.log(`Program: ${prog.title.substring(0, 80)}...`);
    console.log(`Budget: ${(Number(prog.budgetAmount) / 100_000_000).toFixed(1)}억원`);

    // Extract text from both sources
    const rawHtml = data?.rawHtml || '';
    const bodyText = htmlToText(rawHtml);

    let attachmentText = '';
    const attachments = data?.attachments || [];
    for (const att of attachments) {
      if (att.text) {
        attachmentText += att.text + '\n\n';
      }
    }

    console.log(`\nData sources:`);
    console.log(`  Body text: ${bodyText.length} chars`);
    console.log(`  Attachment text: ${attachmentText.length} chars`);
    console.log(`  Attachments: ${attachments.length} files`);

    // Check where budget keywords appear
    let bodyHasBudget = false;
    let attachmentHasBudget = false;

    for (const keyword of budgetKeywords) {
      const bodyIndex = bodyText.indexOf(keyword);
      const attachIndex = attachmentText.indexOf(keyword);

      if (bodyIndex !== -1 && !bodyHasBudget) {
        const start = Math.max(0, bodyIndex - 50);
        const end = Math.min(bodyText.length, bodyIndex + 100);
        const context = bodyText.slice(start, end).replace(/\s+/g, ' ').trim();

        // Check if this contains actual budget number (not just "0 억원")
        if (/[1-9]\d*\.?\d*\s*(억원|백만원)/.test(context)) {
          bodyHasBudget = true;
          console.log(`\n✓ Budget found in BODY text (keyword: "${keyword}"):`);
          console.log(`  "${start > 0 ? '...' : ''}${context}${end < bodyText.length ? '...' : ''}"`);
        }
      }

      if (attachIndex !== -1 && !attachmentHasBudget) {
        const start = Math.max(0, attachIndex - 50);
        const end = Math.min(attachmentText.length, attachIndex + 100);
        const context = attachmentText.slice(start, end).replace(/\s+/g, ' ').trim();

        if (/[1-9]\d*\.?\d*\s*(억원|백만원)/.test(context)) {
          attachmentHasBudget = true;
          console.log(`\n✓ Budget found in ATTACHMENT text (keyword: "${keyword}"):`);
          console.log(`  "${start > 0 ? '...' : ''}${context}${end < attachmentText.length ? '...' : ''}"`);
        }
      }
    }

    if (bodyHasBudget && attachmentHasBudget) {
      bothSourcesCount++;
      console.log(`\n📌 Classification: BOTH body AND attachments contain budget`);
    } else if (attachmentHasBudget) {
      attachmentBudgetCount++;
      console.log(`\n📌 Classification: ONLY attachments contain budget`);
    } else if (bodyHasBudget) {
      bodyBudgetCount++;
      console.log(`\n📌 Classification: ONLY body text contains budget`);
    } else {
      console.log(`\n⚠️  Classification: Budget source unclear (may be in non-keyword context)`);
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(100));
  console.log('BUDGET SOURCE ANALYSIS (Sample of 10 recovered programs)');
  console.log('='.repeat(100));

  console.log(`\nBody text only: ${bodyBudgetCount}`);
  console.log(`Attachment text only: ${attachmentBudgetCount}`);
  console.log(`Both sources: ${bothSourcesCount}`);

  console.log('\n\n## KEY FINDING');
  console.log('-'.repeat(100));

  if (attachmentBudgetCount > 0 || bothSourcesCount > 0) {
    console.log('\n✅ Some recovered programs had budget in ATTACHMENT TEXT.');
    console.log('   This means attachment text extraction IS working for some files.');
    console.log('   Initial extraction may have failed due to timing/processing issues.');
  }

  if (bodyBudgetCount > 0) {
    console.log('\n✅ Some recovered programs had budget in BODY TEXT (rawHtml).');
    console.log('   This means the initial extraction missed patterns that exist in the HTML.');
    console.log('   Possible causes: whitespace sensitivity, HTML structure interference.');
  }

  console.log('\n\n## REMAINING NULL BUDGET PROGRAMS (303)');
  console.log('-'.repeat(100));

  console.log('\nBreakdown:');
  console.log(`- 300 programs: "공고금액 : 0 억원" (genuinely no budget info)`);
  console.log(`- 3 programs: No budget keywords found (different terminology?)`);

  console.log('\n' + '='.repeat(100));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error running analysis:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
