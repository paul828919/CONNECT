import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

/**
 * Verify attachment existence for programs with "0 억원" budget
 * Categorize:
 * 1. Programs WITH attachments (extraction failed - fixable)
 * 2. Programs WITHOUT attachments (no data source - not fixable)
 */
async function main() {
  console.log('='.repeat(100));
  console.log('ATTACHMENT VERIFICATION: 300 Programs with "공고금액 : 0 억원"');
  console.log('='.repeat(100));

  // Get all programs where re-extraction found "0 억원" pattern
  // These are the 300 programs we need to verify
  const zeroAmountPrograms = await prisma.funding_programs.findMany({
    where: {
      agencyId: 'NTIS',
      budgetAmount: null,
    },
    select: {
      id: true,
      title: true,
      scraping_job: {
        select: {
          id: true,
          detailPageData: true,
        },
      },
    },
  });

  console.log(`\n📊 Found ${zeroAmountPrograms.length} programs with NULL budget\n`);

  let withAttachments = 0;
  let withoutAttachments = 0;
  let withAttachmentsButNoText = 0;
  let confirmedZeroAmount = 0;

  const programsWithAttachments: Array<{
    programId: string;
    title: string;
    attachmentCount: number;
    totalTextLength: number;
    hasZeroPattern: boolean;
    attachmentDetails: Array<{
      filename: string;
      hasText: boolean;
      textLength: number;
    }>;
  }> = [];

  const programsWithoutAttachments: Array<{
    programId: string;
    title: string;
    hasZeroPattern: boolean;
  }> = [];

  console.log('Starting verification...\n');

  for (let i = 0; i < zeroAmountPrograms.length; i++) {
    const prog = zeroAmountPrograms[i];
    const data = prog.scraping_job?.detailPageData as any;

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${zeroAmountPrograms.length} programs processed...`);
    }

    const rawHtml = data?.rawHtml || '';
    const attachments = data?.attachments || [];

    // Check if detail page has "0 억원" pattern
    const hasZeroPattern = /공고금액[^\d]*0\s*억원/i.test(rawHtml);

    if (attachments.length === 0) {
      // No attachments at all
      withoutAttachments++;
      programsWithoutAttachments.push({
        programId: prog.id,
        title: prog.title,
        hasZeroPattern,
      });
    } else {
      // Has attachments - check if they contain text
      let totalTextLength = 0;
      const attachmentDetails = attachments.map((att: any) => {
        const textLength = att.text?.length || 0;
        totalTextLength += textLength;
        return {
          filename: att.filename || 'Unknown',
          hasText: !!att.text && att.text.length > 0,
          textLength,
        };
      });

      if (totalTextLength === 0) {
        // Has attachments but no text extracted
        withAttachmentsButNoText++;
      } else {
        withAttachments++;
      }

      programsWithAttachments.push({
        programId: prog.id,
        title: prog.title,
        attachmentCount: attachments.length,
        totalTextLength,
        hasZeroPattern,
        attachmentDetails,
      });
    }

    if (hasZeroPattern) {
      confirmedZeroAmount++;
    }
  }

  // Results
  console.log('\n\n' + '='.repeat(100));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(100));

  const totalProcessed = zeroAmountPrograms.length;
  console.log(`\nTotal programs verified: ${totalProcessed}`);

  console.log(`\n✅ Programs WITH attachments: ${withAttachments + withAttachmentsButNoText} (${(((withAttachments + withAttachmentsButNoText) / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   - With extracted text: ${withAttachments} programs`);
  console.log(`   - Without extracted text: ${withAttachmentsButNoText} programs (extraction failed)`);

  console.log(`\n❌ Programs WITHOUT attachments: ${withoutAttachments} (${((withoutAttachments / totalProcessed) * 100).toFixed(1)}%)`);
  console.log(`   - These legitimately cannot have budget extracted`);

  console.log(`\n📌 Programs with "공고금액 : 0 억원" in HTML: ${confirmedZeroAmount} (${((confirmedZeroAmount / totalProcessed) * 100).toFixed(1)}%)`);

  // Sample of programs WITH attachments (potential extraction failures)
  if (programsWithAttachments.length > 0) {
    console.log('\n\n## PROGRAMS WITH ATTACHMENTS (Sample - Extraction May Have Failed):');
    console.log('-'.repeat(100));

    const sampleSize = Math.min(10, programsWithAttachments.length);
    for (let i = 0; i < sampleSize; i++) {
      const prog = programsWithAttachments[i];
      console.log(`\n${i + 1}. ${prog.title.substring(0, 80)}...`);
      console.log(`   Program ID: ${prog.programId}`);
      console.log(`   Attachments: ${prog.attachmentCount} files`);
      console.log(`   Total text extracted: ${prog.totalTextLength} chars`);
      console.log(`   Has "0 억원" pattern: ${prog.hasZeroPattern ? 'YES' : 'NO'}`);

      console.log(`   Attachment details:`);
      prog.attachmentDetails.forEach((att, idx) => {
        console.log(`     ${idx + 1}. ${att.filename} (${att.textLength} chars)`);
      });
    }

    if (programsWithAttachments.length > sampleSize) {
      console.log(`\n... and ${programsWithAttachments.length - sampleSize} more programs with attachments`);
    }
  }

  // Sample of programs WITHOUT attachments
  if (programsWithoutAttachments.length > 0) {
    console.log('\n\n## PROGRAMS WITHOUT ATTACHMENTS (Sample - Legitimate Data Gap):');
    console.log('-'.repeat(100));

    const sampleSize = Math.min(10, programsWithoutAttachments.length);
    for (let i = 0; i < sampleSize; i++) {
      const prog = programsWithoutAttachments[i];
      console.log(`\n${i + 1}. ${prog.title.substring(0, 80)}...`);
      console.log(`   Program ID: ${prog.programId}`);
      console.log(`   Has "0 억원" pattern: ${prog.hasZeroPattern ? 'YES' : 'NO'}`);
    }

    if (programsWithoutAttachments.length > sampleSize) {
      console.log(`\n... and ${programsWithoutAttachments.length - sampleSize} more programs without attachments`);
    }
  }

  console.log('\n\n## CRITICAL FINDINGS');
  console.log('-'.repeat(100));

  console.log(`\n1. FIXABLE FAILURES (Programs with attachments):`);
  console.log(`   - ${withAttachments} programs have attachments WITH text`);
  console.log(`   - Budget extraction from these attachments may have failed`);
  console.log(`   - These are POTENTIALLY RECOVERABLE`);

  console.log(`\n2. PARTIAL FAILURES (Attachments exist but no text extracted):`);
  console.log(`   - ${withAttachmentsButNoText} programs have attachments WITHOUT text`);
  console.log(`   - Text extraction from attachments failed (OCR/parsing issue)`);
  console.log(`   - These need TEXT EXTRACTION fixes, not budget extraction fixes`);

  console.log(`\n3. LEGITIMATE DATA GAPS (No attachments):`);
  console.log(`   - ${withoutAttachments} programs have NO attachments at all`);
  console.log(`   - These encountered NTIS "No files" popup during scraping`);
  console.log(`   - These are NOT FIXABLE (no data source exists)`);

  console.log('\n\n## REVISED TARGET ASSESSMENT');
  console.log('-'.repeat(100));

  const totalNTIS = 827;
  const currentWithBudget = 524;
  const potentialRecoverable = withAttachments;
  const maxAchievable = currentWithBudget + potentialRecoverable;
  const maxSuccessRate = (maxAchievable / totalNTIS) * 100;

  console.log(`\nCurrent success rate: ${((currentWithBudget / totalNTIS) * 100).toFixed(1)}% (${currentWithBudget}/${totalNTIS})`);
  console.log(`Potentially recoverable: ${potentialRecoverable} programs (have attachments with text)`);
  console.log(`Maximum achievable: ${maxSuccessRate.toFixed(1)}% (${maxAchievable}/${totalNTIS})`);
  console.log(`Legitimate data gaps: ${withoutAttachments} programs (${((withoutAttachments / totalNTIS) * 100).toFixed(1)}%)`);

  if (maxSuccessRate >= 98.0) {
    console.log(`\n✅ 98% TARGET IS ACHIEVABLE if we fix attachment text extraction!`);
  } else {
    console.log(`\n⚠️  98% target requires fixing ${potentialRecoverable} programs with attachments`);
    console.log(`   Gap to 98%: ${(98.0 - maxSuccessRate).toFixed(1)} percentage points`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('END OF VERIFICATION REPORT');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error running verification:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
