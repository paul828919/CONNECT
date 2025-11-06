import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

/**
 * Convert HTML to plain text by stripping tags (from two-tier-extractor.ts)
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

async function main() {
  console.log('='.repeat(100));
  console.log('BUDGET EXTRACTION FAILURE DIAGNOSTIC REPORT V2');
  console.log('Properly extracts text from rawHtml and attachmentFiles');
  console.log('='.repeat(100));

  // Get statistics
  const totalNTIS = await prisma.funding_programs.count({
    where: { agencyId: 'NTIS' },
  });

  const totalNullBudget = await prisma.funding_programs.count({
    where: {
      agencyId: 'NTIS',
      budgetAmount: null,
    },
  });

  const totalWithBudget = totalNTIS - totalNullBudget;

  console.log('\n## DATABASE STATISTICS');
  console.log('-'.repeat(100));
  console.log(`Total NTIS programs: ${totalNTIS}`);
  console.log(`Programs with NULL budget: ${totalNullBudget} (${((totalNullBudget / totalNTIS) * 100).toFixed(1)}%)`);
  console.log(`Programs with budget: ${totalWithBudget} (${((totalWithBudget / totalNTIS) * 100).toFixed(1)}%)`);

  // Sample 1: Get successful cases for comparison
  console.log('\n\n## PART 1: SUCCESSFUL BUDGET EXTRACTIONS (for reference)');
  console.log('-'.repeat(100));

  const successfulPrograms = await prisma.funding_programs.findMany({
    where: {
      agencyId: 'NTIS',
      budgetAmount: { not: null },
      scraping_job: { isNot: null },
    },
    select: {
      id: true,
      title: true,
      budgetAmount: true,
    },
    take: 5,
  });

  console.log(`\nFound ${successfulPrograms.length} successful examples:`);
  for (const prog of successfulPrograms) {
    const budgetKRW = Number(prog.budgetAmount) / 100_000_000;
    console.log(`  - ${prog.title.substring(0, 60)}... : ${budgetKRW.toFixed(1)}억원`);
  }

  // Sample 2: Get failed cases
  console.log('\n\n## PART 2: FAILED BUDGET EXTRACTIONS (detailed analysis)');
  console.log('-'.repeat(100));

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
      fundingProgram: {
        select: {
          id: true,
          budgetAmount: true,
        },
      },
    },
    take: 10,
  });

  console.log(`\nAnalyzing ${failedJobs.length} failed scraping jobs...\n`);

  // Budget keywords to search for
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

  let hwpConversionFailures = 0;
  let patternMismatchCases = 0;
  let missingSynonymCases = 0;
  let textExtractionIssues = 0;

  for (const job of failedJobs) {
    const data = job.detailPageData as any;

    console.log(`\n${'='.repeat(100)}`);
    console.log(`Job ID: ${job.id}`);
    console.log(`Title: ${job.announcementTitle}`);

    // Extract text from rawHtml
    const rawHtml = data?.rawHtml || '';
    const bodyText = htmlToText(rawHtml);

    // Extract attachment text
    let attachmentText = '';
    let hasHWPError = false;
    const attachments = data?.attachments || [];

    console.log(`\n--- Data Sources ---`);
    console.log(`Raw HTML length: ${rawHtml.length} chars`);
    console.log(`Body text (after HTML extraction): ${bodyText.length} chars`);

    if (attachments.length > 0) {
      console.log(`\nAttachments (${attachments.length}):`);
      for (const att of attachments) {
        console.log(`  - ${att.filename} (${att.extension})`);
        if (att.text) {
          attachmentText += att.text + '\n\n';
          console.log(`    Text extracted: ${att.text.length} chars`);
        } else if (att.extractionError) {
          console.log(`    ❌ ERROR: ${att.extractionError}`);
          if (att.extension === 'hwp') {
            hasHWPError = true;
          }
        } else {
          console.log(`    ⚠️  No text extracted (no error logged)`);
        }
      }
    } else {
      console.log('\nNo attachments found.');
    }

    const combinedText = bodyText + '\n\n' + attachmentText;
    console.log(`\nCombined text length: ${combinedText.length} chars`);

    // Categorize failure type
    if (hasHWPError) {
      hwpConversionFailures++;
      console.log('\n🔴 FAILURE TYPE: HWP Conversion Error');
    } else if (combinedText.length < 500) {
      textExtractionIssues++;
      console.log('\n🔴 FAILURE TYPE: Insufficient Text Extraction (<500 chars)');
    } else {
      // Search for budget keywords
      console.log('\n--- Budget Keyword Search ---');
      let foundKeywords = false;

      for (const keyword of budgetKeywords) {
        const index = combinedText.indexOf(keyword);
        if (index !== -1) {
          foundKeywords = true;
          const start = Math.max(0, index - 150);
          const end = Math.min(combinedText.length, index + 150);
          const context = combinedText.slice(start, end).replace(/\s+/g, ' ').trim();

          console.log(`\n✓ Found "${keyword}" at position ${index}:`);
          console.log(`  Context: ${start > 0 ? '...' : ''}${context}${end < combinedText.length ? '...' : ''}`);
        }
      }

      if (foundKeywords) {
        patternMismatchCases++;
        console.log('\n🔴 FAILURE TYPE: Pattern Mismatch (keywords found but regex failed)');
      } else {
        missingSynonymCases++;
        console.log('\n🔴 FAILURE TYPE: Missing Synonyms (no budget keywords found)');
      }
    }
  }

  // Summary statistics
  console.log('\n\n' + '='.repeat(100));
  console.log('## FAILURE CATEGORIZATION SUMMARY');
  console.log('='.repeat(100));

  const total = failedJobs.length;
  console.log(`\nTotal analyzed programs: ${total}`);
  console.log(`\n1. HWP Conversion Failures: ${hwpConversionFailures} (${((hwpConversionFailures / total) * 100).toFixed(1)}%)`);
  console.log(`   - Budget information trapped in unconverted HWP files`);
  console.log(`   - Hancom Docs login timeout or conversion error`);

  console.log(`\n2. Pattern Mismatch: ${patternMismatchCases} (${((patternMismatchCases / total) * 100).toFixed(1)}%)`);
  console.log(`   - Budget keywords found in text but current regex patterns failed`);
  console.log(`   - Likely causes: newlines, qualifiers, reversed order, ranges`);

  console.log(`\n3. Missing Synonyms: ${missingSynonymCases} (${((missingSynonymCases / total) * 100).toFixed(1)}%)`);
  console.log(`   - No budget keywords found in text >500 chars`);
  console.log(`   - Budget described using terms not in current 19-synonym list`);

  console.log(`\n4. Text Extraction Issues: ${textExtractionIssues} (${((textExtractionIssues / total) * 100).toFixed(1)}%)`);
  console.log(`   - Combined text <500 chars (insufficient data)`);
  console.log(`   - Possible scraping or parsing problems`);

  // Extrapolate to full dataset
  console.log('\n\n## EXTRAPOLATED IMPACT (Full Dataset)');
  console.log('-'.repeat(100));
  console.log(`If these proportions hold for all ${totalNullBudget} failed programs:\n`);

  const hwpImpact = Math.round((hwpConversionFailures / total) * totalNullBudget);
  const patternImpact = Math.round((patternMismatchCases / total) * totalNullBudget);
  const synonymImpact = Math.round((missingSynonymCases / total) * totalNullBudget);
  const textImpact = Math.round((textExtractionIssues / total) * totalNullBudget);

  console.log(`HWP Conversion: ~${hwpImpact} programs`);
  console.log(`Pattern Mismatch: ~${patternImpact} programs`);
  console.log(`Missing Synonyms: ~${synonymImpact} programs`);
  console.log(`Text Extraction: ~${textImpact} programs`);

  console.log('\n\n## RECOMMENDATIONS');
  console.log('-'.repeat(100));
  console.log('\nBased on this diagnostic analysis with REAL data:');
  console.log('\n1. **Priority 1**: Address the largest failure category identified above');
  console.log('\n2. **Priority 2**: Enhance regex patterns if pattern mismatch is significant');
  console.log('   - Add flexible whitespace handling');
  console.log('   - Support qualifiers (최대, 최소, 이내, 과제당)');
  console.log('   - Support reversed order and ranges');

  console.log('\n3. **Priority 3**: Expand synonym list if missing synonyms are significant');

  console.log('\n\n## TARGET ASSESSMENT');
  console.log('-'.repeat(100));
  console.log('\nCan we achieve 98%+ budget extraction rate?');
  console.log('\n✅ Decision depends on failure distribution identified above.');
  console.log('❌ If HWP conversion is >50%, fix HWP first. Otherwise, fix patterns/synonyms.');

  console.log('\n' + '='.repeat(100));
  console.log('END OF DIAGNOSTIC REPORT V2');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error running diagnostic:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
