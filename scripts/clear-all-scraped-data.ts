/**
 * Clear ALL Scraped Data (Two-Phase Architecture)
 *
 * This script performs comprehensive cleanup:
 * 1. Deletes all scraping_jobs records (Phase 1: Discovery)
 * 2. Deletes all funding_programs records (Phase 2: Processing)
 * 3. Deletes all funding_matches records (foreign key cleanup)
 * 4. Deletes all attachment folders from disk
 * 5. Deletes checkpoint files
 *
 * Usage: npx tsx scripts/clear-all-scraped-data.ts
 *
 * ⚠️ WARNING: This action is irreversible! All scraped data will be deleted.
 */

import { db } from '@/lib/db';
import * as fs from 'fs/promises';
import * as path from 'path';

async function clearAllScrapedData() {
  console.log('🗑️  Clear All Scraped Data Script (Two-Phase Architecture)\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Count total records
    const totalPrograms = await db.funding_programs.count();
    const totalJobs = await db.scraping_jobs.count();

    console.log(`📊 Current Database State:`);
    console.log(`   - funding_programs: ${totalPrograms} records`);
    console.log(`   - scraping_jobs: ${totalJobs} records\n`);

    if (totalPrograms === 0 && totalJobs === 0) {
      console.log('✅ Database is already empty. Nothing to delete.\n');
      // Still check disk cleanup
      await cleanupDiskStorage();
      return;
    }

    // 2. Show breakdown by scraping source (funding_programs)
    if (totalPrograms > 0) {
      const sourceBreakdown = await db.funding_programs.groupBy({
        by: ['scrapingSource'],
        _count: true
      });

      console.log('📋 Programs by Scraping Source:');
      console.log('─────────────────────────────────────────────────────────');
      sourceBreakdown.forEach(item => {
        const source = item.scrapingSource || 'NULL';
        const count = item._count;
        console.log(`   ${source.padEnd(15)} ${count} programs`);
      });
      console.log('─────────────────────────────────────────────────────────\n');
    }

    // 3. Show scraping_jobs breakdown by status
    if (totalJobs > 0) {
      const jobsByStatus = await db.scraping_jobs.groupBy({
        by: ['scrapingStatus', 'processingStatus'],
        _count: true
      });

      console.log('📋 Scraping Jobs by Status:');
      console.log('─────────────────────────────────────────────────────────');
      jobsByStatus.forEach(item => {
        console.log(`   ${item.scrapingStatus}/${item.processingStatus}: ${item._count} jobs`);
      });
      console.log('─────────────────────────────────────────────────────────\n');
    }

    // 4. Delete all matches first (foreign key constraints)
    console.log('🗑️  Step 1: Deleting all funding matches...');
    const matchesDeleted = await db.funding_matches.deleteMany({});
    console.log(`✅ Deleted ${matchesDeleted.count} matches\n`);

    // 5. Delete ALL funding programs
    if (totalPrograms > 0) {
      console.log('🗑️  Step 2: Deleting ALL funding programs...');
      console.log(`   This will delete ${totalPrograms} programs from all sources.\n`);

      const programsDeleted = await db.funding_programs.deleteMany({});
      console.log(`✅ Deleted ${programsDeleted.count} programs\n`);
    }

    // 6. Delete ALL scraping jobs (two-phase architecture)
    if (totalJobs > 0) {
      console.log('🗑️  Step 3: Deleting ALL scraping jobs...');
      console.log(`   This will delete ${totalJobs} jobs (discovery + processing records).\n`);

      const jobsDeleted = await db.scraping_jobs.deleteMany({});
      console.log(`✅ Deleted ${jobsDeleted.count} jobs\n`);
    }

    // 7. Delete attachment folders from disk
    console.log('🗑️  Step 4: Deleting attachment folders from disk...');
    await cleanupDiskStorage();

    // 8. Delete checkpoint files
    console.log('🗑️  Step 5: Deleting checkpoint files...');
    await cleanupCheckpoints();

    // 9. Verify deletion
    const programsAfter = await db.funding_programs.count();
    const jobsAfter = await db.scraping_jobs.count();

    console.log('\n═══════════════════════════════════════════════════════════');
    if (programsAfter === 0 && jobsAfter === 0) {
      console.log('✅ SUCCESS: All scraped data deleted successfully!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`\n📂 Total deleted:`);
      console.log(`   - ${totalPrograms} funding programs`);
      console.log(`   - ${totalJobs} scraping jobs`);
      console.log(`   - ${matchesDeleted.count} funding matches`);
      console.log(`   - Disk attachments & checkpoints`);
      console.log('\n✅ Database is now clean and ready for parallel testing.\n');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('📝 Next Steps - Parallel Testing:\n');
      console.log('Terminal 1 (Q1 2025):');
      console.log('  docker exec -it connect_dev_scraper npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-01-01 --toDate 2025-03-31\n');
      console.log('Terminal 2 (Q2 2025):');
      console.log('  docker exec -it connect_dev_scraper npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-04-01 --toDate 2025-06-30\n');
      console.log('Terminal 3 (Q3 2025):');
      console.log('  docker exec -it connect_dev_scraper npx tsx scripts/scrape-ntis-discovery.ts --fromDate 2025-07-01 --toDate 2025-10-30\n');
    } else {
      console.log('⚠️  WARNING: Some records remain in database!');
      console.log(`   Remaining programs: ${programsAfter}`);
      console.log(`   Remaining jobs: ${jobsAfter}`);
      console.log('═══════════════════════════════════════════════════════════\n');
    }

  } catch (error: any) {
    console.error('❌ Error during deletion:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

/**
 * Clean up disk storage (attachment folders)
 */
async function cleanupDiskStorage(): Promise<void> {
  const attachmentBaseDir = process.env.NTIS_ATTACHMENT_DIR || path.join(process.cwd(), 'data/ntis-attachments');

  try {
    const stats = await fs.stat(attachmentBaseDir);
    if (stats.isDirectory()) {
      // Count files before deletion
      let totalFiles = 0;
      let totalFolders = 0;

      async function countFiles(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            totalFolders++;
            await countFiles(fullPath);
          } else {
            totalFiles++;
          }
        }
      }

      await countFiles(attachmentBaseDir);

      console.log(`   Found ${totalFiles} files in ${totalFolders} folders`);
      console.log(`   Deleting: ${attachmentBaseDir}`);

      // Delete entire attachment directory
      await fs.rm(attachmentBaseDir, { recursive: true, force: true });
      console.log(`✅ Deleted ${totalFiles} attachment files\n`);
    } else {
      console.log(`   No attachment directory found at ${attachmentBaseDir}\n`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`   No attachment directory found (${attachmentBaseDir})\n`);
    } else {
      console.warn(`   ⚠️  Error deleting attachments: ${error.message}\n`);
    }
  }
}

/**
 * Clean up checkpoint files
 */
async function cleanupCheckpoints(): Promise<void> {
  const checkpointFiles = [
    '/tmp/ntis-discovery-checkpoint.json',
    '/tmp/ntis-historical-checkpoint.json',
    '/tmp/iitp-checkpoint.json',
  ];

  let deletedCount = 0;

  for (const checkpointPath of checkpointFiles) {
    try {
      await fs.unlink(checkpointPath);
      console.log(`   ✓ Deleted: ${path.basename(checkpointPath)}`);
      deletedCount++;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`   ⚠️  Error deleting ${path.basename(checkpointPath)}: ${error.message}`);
      }
    }
  }

  if (deletedCount > 0) {
    console.log(`✅ Deleted ${deletedCount} checkpoint file(s)\n`);
  } else {
    console.log(`   No checkpoint files found\n`);
  }
}

// Execute
clearAllScrapedData();
