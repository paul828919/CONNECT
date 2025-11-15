#!/usr/bin/env tsx
/**
 * Reset programs with NULL attachment text to PENDING status
 *
 * Purpose: Prepare failed programs for reprocessing inside Docker
 *
 * Usage:
 *   NODE_ENV=development npx tsx scripts/reset-null-text-programs.ts --dry-run
 *   NODE_ENV=development npx tsx scripts/reset-null-text-programs.ts --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');

  if (!dryRun && !apply) {
    console.error('❌ Error: Must specify --dry-run or --apply');
    console.error('Usage:');
    console.error('  npx tsx scripts/reset-null-text-programs.ts --dry-run  (preview changes)');
    console.error('  npx tsx scripts/reset-null-text-programs.ts --apply     (apply changes)');
    process.exit(1);
  }

  console.log('════════════════════════════════════════════════════════════════════════');
  console.log(`RESET NULL TEXT PROGRAMS ${dryRun ? '(DRY RUN)' : '(APPLYING)'}`);
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('');

  // Find all jobs with NULL attachment text
  const affectedJobs: any[] = await prisma.$queryRaw`
    SELECT
      sj.id,
      sj."announcementTitle",
      sj."dateRange",
      sj."attachmentFolder",
      EXTRACT(EPOCH FROM (sj."processedAt" - sj."processingStartedAt")) as processing_seconds
    FROM scraping_jobs sj
    WHERE sj."processingStatus" = 'COMPLETED'
      AND sj."scrapingStatus" = 'SCRAPED'
      AND sj."detailPageData"::jsonb -> 'attachments' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(sj."detailPageData"::jsonb -> 'attachments') AS att
        WHERE att->>'text' IS NOT NULL
          AND att->>'text' != ''
          AND att->>'text' != 'null'
          AND LENGTH(att->>'text') > 50
      )
    ORDER BY sj."createdAt" DESC
  `;

  console.log(`Found ${affectedJobs.length} programs with NULL attachment text\n`);

  if (affectedJobs.length === 0) {
    console.log('✅ No programs to reset. All programs have extracted text.');
    return;
  }

  // Show sample programs
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('SAMPLE PROGRAMS (first 5)');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('');

  const samples = affectedJobs.slice(0, 5);
  samples.forEach((job, i) => {
    console.log(`${i + 1}. ${job.announcementTitle.substring(0, 60)}...`);
    console.log(`   Date Range: ${job.dateRange}`);
    console.log(`   Processing Time: ${job.processing_seconds}s (fast = failed)`);
    console.log(`   Folder: ${job.attachmentFolder}`);
    console.log('');
  });

  if (dryRun) {
    console.log('─────────────────────────────────────────────────────────────────────────');
    console.log('DRY RUN COMPLETE - NO CHANGES MADE');
    console.log('─────────────────────────────────────────────────────────────────────────');
    console.log('');
    console.log(`✓ Would reset ${affectedJobs.length} programs to PENDING status`);
    console.log('✓ Would clear processing timestamps and errors');
    console.log('');
    console.log('To apply these changes, run:');
    console.log('  NODE_ENV=development npx tsx scripts/reset-null-text-programs.ts --apply');
    console.log('');
    return;
  }

  // Apply the reset
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('APPLYING RESET');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('');

  const result = await prisma.$executeRaw`
    UPDATE scraping_jobs
    SET
      "processingStatus" = 'PENDING',
      "processingStartedAt" = NULL,
      "processedAt" = NULL,
      "processingError" = NULL,
      "processingAttempts" = 0
    WHERE id IN (
      SELECT sj.id
      FROM scraping_jobs sj
      WHERE sj."processingStatus" = 'COMPLETED'
        AND sj."scrapingStatus" = 'SCRAPED'
        AND sj."detailPageData"::jsonb -> 'attachments' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(sj."detailPageData"::jsonb -> 'attachments') AS att
          WHERE att->>'text' IS NOT NULL
            AND att->>'text' != ''
            AND att->>'text' != 'null'
            AND LENGTH(att->>'text') > 50
        )
    )
  `;

  console.log(`✅ Reset ${result} programs to PENDING status`);
  console.log('');
  console.log('Changes applied:');
  console.log('  1. ✓ Set processingStatus = PENDING');
  console.log('  2. ✓ Cleared processingStartedAt');
  console.log('  3. ✓ Cleared processedAt');
  console.log('  4. ✓ Cleared processingError');
  console.log('  5. ✓ Reset processingAttempts to 0');
  console.log('');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('NEXT STEPS');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('1. Run the processor INSIDE Docker container:');
  console.log('   docker exec connect_dev_scraper npx tsx scripts/scrape-ntis-processor.ts \\');
  console.log('     --maxJobs 100');
  console.log('');
  console.log('2. Monitor processing logs:');
  console.log('   docker logs -f connect_dev_scraper');
  console.log('');
  console.log('3. Verify extraction success:');
  console.log('   npx tsx scripts/count-null-attachment-text.ts');
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════');
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
