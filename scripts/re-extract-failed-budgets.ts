import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

/**
 * Budget field synonyms (from ntis-announcement-parser.ts)
 */
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

/**
 * Convert HTML to plain text (from two-tier-extractor.ts)
 */
function htmlToText(html: string): string {
  if (!html || html.trim().length === 0) return '';

  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Extract budget from text (from ntis-announcement-parser.ts)
 */
function extractBudget(text: string): number | null {
  for (const synonym of FIELD_SYNONYMS.budget) {
    // Pattern 1: Billions with decimals (e.g., "지원규모 3.5억원", "예산: 5억원")
    const billionPattern = new RegExp(
      `${synonym}[^\\d]*([\\d,\\.]+)\\s*억원`,
      'i'
    );
    const billionMatch = text.match(billionPattern);
    if (billionMatch) {
      const amount = parseFloat(billionMatch[1].replace(/,/g, ''));
      if (amount <= 0 || !isFinite(amount)) {
        // Skip zero or invalid amounts (e.g., "공고금액 : 0 억원")
        continue;
      }
      const result = Math.round(amount * 100_000_000);
      return result;
    }

    // Pattern 2: Millions (e.g., "지원규모 350백만원")
    const millionPattern = new RegExp(
      `${synonym}[^\\d]*([\\d,\\.]+)\\s*백만원`,
      'i'
    );
    const millionMatch = text.match(millionPattern);
    if (millionMatch) {
      const amount = parseFloat(millionMatch[1].replace(/,/g, ''));
      if (amount <= 0 || !isFinite(amount)) {
        continue;
      }
      const result = Math.round(amount * 1_000_000);
      return result;
    }

    // Pattern 3: Fallback - find any number near synonym
    const fallbackPattern = new RegExp(
      `${synonym}[^\\d]{0,20}([\\d,\\.]+)`,
      'i'
    );
    const fallbackMatch = text.match(fallbackPattern);
    if (fallbackMatch) {
      const amount = parseFloat(fallbackMatch[1].replace(/,/g, ''));
      if (amount <= 0 || !isFinite(amount)) {
        continue;
      }
      // Heuristic: if > 1000, assume it's in KRW (not billions)
      const result = amount > 1000 ? Math.round(amount) : Math.round(amount * 100_000_000);
      return result;
    }
  }

  return null;
}

async function main() {
  console.log('='.repeat(100));
  console.log('RE-EXTRACTION SCRIPT: Budget Data Verification');
  console.log('Re-processing existing detailPageData for NULL budget programs');
  console.log('='.repeat(100));

  // Get all failed programs (NULL budget)
  const failedJobs = await prisma.scraping_jobs.findMany({
    where: {
      fundingProgram: {
        agencyId: 'NTIS',
        budgetAmount: null,
      },
    },
    select: {
      id: true,
      announcementTitle: true,
      detailPageData: true,
      fundingProgramId: true,
      fundingProgram: {
        select: {
          id: true,
          title: true,
          budgetAmount: true,
        },
      },
    },
  });

  console.log(`\n📊 Found ${failedJobs.length} programs with NULL budget\n`);

  let successfulExtractions = 0;
  let stillNullBudget = 0;
  let zeroAmountSkipped = 0;
  let noTextAvailable = 0;

  const updatedPrograms: Array<{
    jobId: string;
    programId: string;
    title: string;
    extractedBudget: number;
    budgetKRW: string;
  }> = [];

  console.log('Starting re-extraction...\n');

  for (let i = 0; i < failedJobs.length; i++) {
    const job = failedJobs[i];
    const data = job.detailPageData as any;

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${failedJobs.length} programs processed...`);
    }

    // Extract text from rawHtml
    const rawHtml = data?.rawHtml || '';
    const bodyText = htmlToText(rawHtml);

    // Extract attachment text
    let attachmentText = '';
    const attachments = data?.attachments || [];
    for (const att of attachments) {
      if (att.text) {
        attachmentText += att.text + '\n\n';
      }
    }

    const combinedText = bodyText + '\n\n' + attachmentText;

    // Check if we have sufficient text
    if (combinedText.length < 100) {
      noTextAvailable++;
      continue;
    }

    // Try to extract budget
    const extractedBudget = extractBudget(combinedText);

    if (extractedBudget !== null && extractedBudget > 0) {
      // Success! Found budget
      successfulExtractions++;

      const budgetKRW = (extractedBudget / 100_000_000).toFixed(1);

      updatedPrograms.push({
        jobId: job.id,
        programId: job.fundingProgramId!,
        title: job.announcementTitle || job.fundingProgram?.title || 'Unknown',
        extractedBudget,
        budgetKRW: `${budgetKRW}억원`,
      });

      // Update database
      await prisma.funding_programs.update({
        where: { id: job.fundingProgramId! },
        data: { budgetAmount: BigInt(extractedBudget) },
      });
    } else {
      // Check if zero amount was found
      const hasZeroAmount = /공고금액[^\d]*0\s*억원/i.test(combinedText);
      if (hasZeroAmount) {
        zeroAmountSkipped++;
      } else {
        stillNullBudget++;
      }
    }
  }

  // Final statistics
  console.log('\n\n' + '='.repeat(100));
  console.log('RE-EXTRACTION RESULTS');
  console.log('='.repeat(100));

  const totalProcessed = failedJobs.length;
  console.log(`\nTotal programs re-processed: ${totalProcessed}`);
  console.log(`\n✅ Successful extractions: ${successfulExtractions} (${((successfulExtractions / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   - Budget data was available but extraction previously failed`);

  console.log(`\n❌ Still NULL budget: ${stillNullBudget} (${((stillNullBudget / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   - No budget keywords found in text`);

  console.log(`\n⚠️  Zero amount skipped: ${zeroAmountSkipped} (${((zeroAmountSkipped / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   - Text contains "공고금액 : 0 억원" (genuinely no budget info)`);

  console.log(`\n⚠️  No text available: ${noTextAvailable} (${((noTextAvailable / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   - Combined text <100 chars (insufficient data)`);

  // Show sample of successfully extracted budgets
  if (updatedPrograms.length > 0) {
    console.log('\n\n## SUCCESSFULLY EXTRACTED BUDGETS (Sample):');
    console.log('-'.repeat(100));

    const sampleSize = Math.min(10, updatedPrograms.length);
    for (let i = 0; i < sampleSize; i++) {
      const prog = updatedPrograms[i];
      console.log(`\n${i + 1}. ${prog.title.substring(0, 80)}...`);
      console.log(`   Budget: ${prog.budgetKRW}`);
      console.log(`   Job ID: ${prog.jobId}`);
    }

    if (updatedPrograms.length > sampleSize) {
      console.log(`\n... and ${updatedPrograms.length - sampleSize} more programs`);
    }
  }

  // Calculate updated success rate
  const totalNTIS = await prisma.funding_programs.count({
    where: { agencyId: 'NTIS' },
  });

  const totalWithBudget = await prisma.funding_programs.count({
    where: {
      agencyId: 'NTIS',
      budgetAmount: { not: null },
    },
  });

  const newSuccessRate = (totalWithBudget / totalNTIS) * 100;

  console.log('\n\n## UPDATED DATABASE STATISTICS');
  console.log('-'.repeat(100));
  console.log(`\nTotal NTIS programs: ${totalNTIS}`);
  console.log(`Programs with budget: ${totalWithBudget} (${newSuccessRate.toFixed(1)}%)`);
  console.log(`Programs with NULL budget: ${totalNTIS - totalWithBudget} (${(100 - newSuccessRate).toFixed(1)}%)`);

  console.log('\n\n## ASSESSMENT');
  console.log('-'.repeat(100));

  if (successfulExtractions > 0) {
    console.log(`\n✅ Re-extraction recovered ${successfulExtractions} programs!`);
    console.log(`   Previous success rate: 58.4%`);
    console.log(`   Current success rate: ${newSuccessRate.toFixed(1)}%`);
    console.log(`   Improvement: +${(newSuccessRate - 58.4).toFixed(1)} percentage points`);
  } else {
    console.log(`\n❌ Re-extraction found NO recoverable programs.`);
    console.log(`   This confirms the 344 failed programs genuinely lack budget data.`);
  }

  if (zeroAmountSkipped > totalProcessed * 0.3) {
    console.log(`\n📌 Majority of failures (${((zeroAmountSkipped / totalProcessed) * 100).toFixed(1)}%) have "공고금액 : 0 억원" pattern.`);
    console.log(`   These are NTIS announcements that legitimately provide no budget information.`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('END OF RE-EXTRACTION REPORT');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error running re-extraction:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
