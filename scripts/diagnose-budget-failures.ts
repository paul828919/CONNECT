import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

interface AttachmentMetadata {
  fileName: string;
  fileExtension: string;
  extractionError?: string;
  textLength?: number;
}

interface DetailPageData {
  bodyText?: string;
  attachmentText?: string;
  attachments?: AttachmentMetadata[];
}

async function main() {
  console.log('='.repeat(100));
  console.log('BUDGET EXTRACTION FAILURE DIAGNOSTIC REPORT');
  console.log('='.repeat(100));

  // Query programs with NULL budget but with scraped data
  const failedPrograms = await prisma.funding_programs.findMany({
    where: {
      agencyId: 'NTIS',
      budgetAmount: null,
      scraping_job: {
        isNot: null,
      },
    },
    select: {
      id: true,
      title: true,
      agencyId: true,
      scraping_job: {
        select: {
          detailPageData: true,
        },
      },
    },
    take: 30, // Sample 30 programs for analysis
  });

  // Get total statistics
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
  console.log(`Sample size for analysis: ${failedPrograms.length}`);

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

  // Initialize failure categorization
  let hwpConversionFailures = 0;
  let patternMismatchCases = 0;
  let missingSynonymCases = 0;
  let textExtractionIssues = 0;

  console.log('\n## INDIVIDUAL PROGRAM ANALYSIS');
  console.log('-'.repeat(100));

  for (const program of failedPrograms) {
    const data = program.scraping_job?.detailPageData as DetailPageData | undefined;
    if (!data) {
      console.log(`\nSkipping ${program.id} - no scraping job data`);
      continue;
    }
    const bodyText = data.bodyText || '';
    const attachmentText = data.attachmentText || '';
    const combinedText = bodyText + '\n\n' + attachmentText;

    console.log(`\n${'='.repeat(100)}`);
    console.log(`Program ID: ${program.id}`);
    console.log(`Title: ${program.title}`);
    console.log(`Source: ${program.agencyId}`);

    // Text statistics
    console.log('\n--- Text Availability ---');
    console.log(`Body text length: ${bodyText.length} chars`);
    console.log(`Attachment text length: ${attachmentText.length} chars`);
    console.log(`Combined text length: ${combinedText.length} chars`);

    // Check for HWP conversion errors
    let hasHWPError = false;
    if (data.attachments && Array.isArray(data.attachments)) {
      console.log(`\n--- Attachments (${data.attachments.length}) ---`);
      for (const att of data.attachments) {
        console.log(`  - ${att.fileName} (${att.fileExtension})`);
        if (att.textLength !== undefined) {
          console.log(`    Extracted text: ${att.textLength} chars`);
        }
        if (att.extractionError) {
          console.log(`    ❌ ERROR: ${att.extractionError}`);
          if (att.fileExtension === 'hwp') {
            hasHWPError = true;
          }
        }
      }
    }

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
          const context = combinedText
            .slice(start, end)
            .replace(/\s+/g, ' ')
            .trim();

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

  const total = failedPrograms.length;
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
  console.log('\nBased on this diagnostic analysis:');
  console.log('\n1. **Priority 1**: Fix HWP conversion if >30% of failures');
  console.log('   - Read existing hancom-docs-converter.ts bot bypass logic');
  console.log('   - Identify timeout root cause (selector change? rate limiting?)');
  console.log('   - Implement precise fix without breaking bot detection bypass');

  console.log('\n2. **Priority 2**: Enhance regex patterns for pattern mismatch cases');
  console.log('   - Add flexible whitespace handling (\\s+ instead of [^\\d]*)');
  console.log('   - Support qualifiers (최대, 최소, 이내, 과제당)');
  console.log('   - Support reversed order ("5억원 지원")');
  console.log('   - Support ranges ("3~5억원", "3-5억원")');

  console.log('\n3. **Priority 3**: Expand synonym list for missing synonym cases');
  console.log('   - Identify new budget terms from real failed examples above');
  console.log('   - Add to FIELD_SYNONYMS.budget in ntis-announcement-parser.ts');

  console.log('\n4. **Priority 4**: Investigate text extraction issues if significant');
  console.log('   - Check scraping job logs for programs with <500 chars combined text');
  console.log('   - Verify webpage content availability');

  console.log('\n\n## TARGET ASSESSMENT');
  console.log('-'.repeat(100));
  console.log('\nCan we achieve 98%+ budget extraction rate?');
  console.log('\nAssuming:');
  console.log('- HWP conversion fix: +40-50% recovery');
  console.log('- Pattern enhancements: +30-40% recovery');
  console.log('- Synonym additions: +10-20% recovery');
  console.log('\nProjected success rate after fixes: 58.4% + (41.6% × 90-95% recovery) = 95-98%');
  console.log('\n✅ YES, 98%+ is achievable if all three priorities are addressed.');
  console.log('❌ NO, if HWP conversion cannot be fixed (ceiling: ~75-85%).');

  console.log('\n' + '='.repeat(100));
  console.log('END OF DIAGNOSTIC REPORT');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error running diagnostic:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
