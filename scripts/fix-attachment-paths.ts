#!/usr/bin/env tsx
/**
 * Fix Attachment Folder Path Normalization
 *
 * Problem: Volume mount ./data/scraper:/app/data creates double /scraper/ directory
 * - Discovery Scraper writes to: /app/data/scraper/ntis-attachments/... (in container)
 * - Creates on host: ./data/scraper/scraper/ntis-attachments/...
 * - Database stores: /app/data/scraper/ntis-attachments/... (missing extra /scraper/)
 * - Processor looks for: /app/data/scraper/ntis-attachments/... (file not found!)
 *
 * Solution: Add missing /scraper/ to database paths
 * - From: /app/data/scraper/ntis-attachments/...
 * - To: /app/data/scraper/scraper/ntis-attachments/...
 *
 * Usage:
 *   NODE_ENV=development npx tsx scripts/fix-attachment-paths.ts --dry-run
 *   NODE_ENV=development npx tsx scripts/fix-attachment-paths.ts --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');

  if (!dryRun && !apply) {
    console.error('❌ Error: Must specify --dry-run or --apply');
    console.error('Usage:');
    console.error('  npx tsx scripts/fix-attachment-paths.ts --dry-run  (preview changes)');
    console.error('  npx tsx scripts/fix-attachment-paths.ts --apply     (apply changes)');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`ATTACHMENT PATH NORMALIZATION FIX ${dryRun ? '(DRY RUN)' : '(APPLYING)'}`);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  // Find all jobs with incorrect paths (missing /scraper/ after /app/data/)
  const affectedJobs: any[] = await prisma.$queryRaw`
    SELECT
      id,
      "attachmentFolder",
      "processingStatus",
      "announcementTitle"
    FROM scraping_jobs
    WHERE "attachmentFolder" LIKE '/app/data/scraper/ntis-attachments/%'
      AND "attachmentFolder" NOT LIKE '/app/data/scraper/scraper/ntis-attachments/%'
    ORDER BY "createdAt" DESC
  `;

  console.log(`Found ${affectedJobs.length} jobs with incorrect paths\n`);

  if (affectedJobs.length === 0) {
    console.log('✅ No paths to fix. All attachment folders are correctly normalized.');
    return;
  }

  // Show sample transformations
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('SAMPLE PATH TRANSFORMATIONS (first 5)');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('');

  const samples = affectedJobs.slice(0, 5);
  samples.forEach((job, i) => {
    const oldPath = job.attachmentFolder;
    const newPath = oldPath.replace(
      '/app/data/scraper/ntis-attachments/',
      '/app/data/scraper/scraper/ntis-attachments/'
    );

    console.log(`${i + 1}. ${job.announcementTitle.substring(0, 60)}...`);
    console.log(`   FROM: ${oldPath}`);
    console.log(`   TO:   ${newPath}`);
    console.log('');
  });

  if (dryRun) {
    console.log('───────────────────────────────────────────────────────────────────────');
    console.log('DRY RUN COMPLETE - NO CHANGES MADE');
    console.log('───────────────────────────────────────────────────────────────────────');
    console.log('');
    console.log(`✓ Would update ${affectedJobs.length} attachment folder paths`);
    console.log('✓ Would reset processing status to PENDING for reprocessing');
    console.log('');
    console.log('To apply these changes, run:');
    console.log('  NODE_ENV=development npx tsx scripts/fix-attachment-paths.ts --apply');
    console.log('');
    return;
  }

  // Apply the fix
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('APPLYING PATH NORMALIZATION');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('');

  const result = await prisma.$executeRaw`
    UPDATE scraping_jobs
    SET
      "attachmentFolder" = REPLACE(
        "attachmentFolder",
        '/app/data/scraper/ntis-attachments/',
        '/app/data/scraper/scraper/ntis-attachments/'
      ),
      "processingStatus" = 'PENDING',
      "processingStartedAt" = NULL,
      "processedAt" = NULL,
      "processingError" = NULL
    WHERE "attachmentFolder" LIKE '/app/data/scraper/ntis-attachments/%'
      AND "attachmentFolder" NOT LIKE '/app/data/scraper/scraper/ntis-attachments/%'
  `;

  console.log(`✅ Updated ${result} scraping_jobs records`);
  console.log('');
  console.log('Changes applied:');
  console.log('  1. ✓ Normalized attachmentFolder paths (added missing /scraper/)');
  console.log('  2. ✓ Reset processingStatus to PENDING');
  console.log('  3. ✓ Cleared processing timestamps');
  console.log('  4. ✓ Cleared processing errors');
  console.log('');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('NEXT STEPS');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('1. Start the scraper Docker container:');
  console.log('   docker-compose -f docker-compose.dev.yml up -d scraper');
  console.log('');
  console.log('2. Run the processor to extract attachment text:');
  console.log('   docker exec connect_dev_scraper npx tsx scripts/scrape-ntis-processor.ts \\');
  console.log('     --dateRange "2025-02-01 to 2025-03-31" \\');
  console.log('     --maxJobs 100');
  console.log('');
  console.log('3. Monitor processing logs:');
  console.log('   docker logs -f connect_dev_scraper');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════');
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
