import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

/**
 * Get 244 programs that have attachments but 0 extracted text
 * Mark their scraping jobs for re-processing by setting status back to 'pending'
 *
 * This will trigger the local Dev Scraper process workers to:
 * 1. Download attachments again
 * 2. Extract text using pyhwp + Hancom fallback
 * 3. Update detailPageData with extracted text
 * 4. Extract budget from the newly extracted text
 */
async function main() {
  console.log('='.repeat(100));
  console.log('RE-PROCESSING: 244 Programs with Attachments but Failed Text Extraction');
  console.log('='.repeat(100));

  // Get programs that have attachments but no text extracted
  const failedTextExtraction = await prisma.funding_programs.findMany({
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
          processingStatus: true,
          detailPageData: true,
        },
      },
    },
  });

  console.log(`\n📊 Found ${failedTextExtraction.length} programs with NULL budget\n`);

  // Filter to only those with attachments but no text
  const programsToReprocess: Array<{
    programId: string;
    jobId: string;
    title: string;
    attachmentCount: number;
  }> = [];

  for (const prog of failedTextExtraction) {
    const data = prog.scraping_job?.detailPageData as any;
    const attachments = data?.attachments || [];

    if (attachments.length > 0) {
      // Check if any attachment has text
      const hasText = attachments.some((att: any) => att.text && att.text.length > 0);

      if (!hasText) {
        // Has attachments but no text extracted
        programsToReprocess.push({
          programId: prog.id,
          jobId: prog.scraping_job!.id,
          title: prog.title,
          attachmentCount: attachments.length,
        });
      }
    }
  }

  console.log(`\n✅ Identified ${programsToReprocess.length} programs for re-processing\n`);

  if (programsToReprocess.length === 0) {
    console.log('No programs need re-processing. Exiting.');
    return;
  }

  // Show sample
  console.log('Sample programs to re-process (first 10):');
  console.log('-'.repeat(100));
  for (let i = 0; i < Math.min(10, programsToReprocess.length); i++) {
    const prog = programsToReprocess[i];
    console.log(`${i + 1}. ${prog.title.substring(0, 80)}...`);
    console.log(`   Job ID: ${prog.jobId}`);
    console.log(`   Attachments: ${prog.attachmentCount} files`);
  }

  if (programsToReprocess.length > 10) {
    console.log(`... and ${programsToReprocess.length - 10} more programs`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('RE-PROCESSING STRATEGY');
  console.log('='.repeat(100));

  console.log('\nOption 1: Reset scraping job processingStatus to "PENDING"');
  console.log('  - Process workers will pick up these jobs automatically');
  console.log('  - Full re-processing: download + text extraction + budget extraction');
  console.log('  - Recommended for comprehensive verification');

  console.log('\nOption 2: Mark jobs for "attachment_retry"');
  console.log('  - Skip detail page scraping, only re-download attachments');
  console.log('  - Faster but requires custom worker logic');

  console.log('\nOption 3: Export job IDs for manual triggering');
  console.log('  - Save IDs to file for selective re-processing');
  console.log('  - Useful for testing specific file types first');

  console.log('\n' + '-'.repeat(100));
  console.log('RECOMMENDATION: Use Option 1 (reset to "PENDING")');
  console.log('-'.repeat(100));

  console.log('\nThis will:');
  console.log('1. Set all 244 scraping jobs to processingStatus="PENDING"');
  console.log('2. Local Dev Scraper process workers will automatically pick them up');
  console.log('3. Workers will re-download attachments and extract text');
  console.log('4. Text extraction will try pyhwp first, then Hancom Docs fallback');
  console.log('5. Budget extraction will run on newly extracted text');
  console.log('6. You can monitor progress via localhost:3000 or database queries');

  console.log('\n' + '='.repeat(100));
  console.log('EXECUTE RE-PROCESSING?');
  console.log('='.repeat(100));

  console.log('\nTo proceed, run:');
  console.log('  npx tsx scripts/execute-reprocessing.ts');

  console.log('\nThis will update the database and trigger re-processing.');

  // Export job IDs to file for reference
  const jobIds = programsToReprocess.map(p => p.jobId);
  const outputPath = '/tmp/failed-text-extraction-job-ids.json';

  const exportData = {
    totalJobs: jobIds.length,
    jobIds: jobIds,
    programs: programsToReprocess.map(p => ({
      jobId: p.jobId,
      programId: p.programId,
      title: p.title.substring(0, 100),
      attachmentCount: p.attachmentCount,
    })),
  };

  await prisma.$disconnect();

  // Write to file
  const fs = await import('fs');
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

  console.log(`\n📄 Job details exported to: ${outputPath}`);
  console.log(`   Total jobs: ${jobIds.length}`);

  console.log('\n' + '='.repeat(100));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
