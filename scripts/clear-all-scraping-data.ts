import { db } from '../lib/db';

/**
 * Clear ALL scraping data
 * - scraping_jobs (pending tasks)
 * - funding_programs (processed results)
 * - extraction_logs (audit logs)
 */

async function clearAllScrapingData() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      CLEARING ALL SCRAPING DATA                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Count before deletion
    const jobsCount = await db.scraping_jobs.count();
    const programsCount = await db.funding_programs.count();
    const logsCount = await db.extraction_logs.count();

    console.log('📊 Records before deletion:');
    console.log(`   scraping_jobs: ${jobsCount.toLocaleString()}`);
    console.log(`   funding_programs: ${programsCount.toLocaleString()}`);
    console.log(`   extraction_logs: ${logsCount.toLocaleString()}`);
    console.log();

    if (jobsCount === 0 && programsCount === 0 && logsCount === 0) {
      console.log('✅ All tables are already empty\n');
      return;
    }

    // Delete in correct order (respect foreign keys)
    console.log('🗑️  Deleting data...\n');

    // 1. Delete extraction_logs first (has FK to scraping_jobs)
    if (logsCount > 0) {
      console.log('   Deleting extraction_logs...');
      const logsResult = await db.extraction_logs.deleteMany({});
      console.log(`   ✓ Deleted ${logsResult.count.toLocaleString()} extraction logs`);
    }

    // 2. Delete funding_programs (has FK to scraping_jobs)
    if (programsCount > 0) {
      console.log('   Deleting funding_programs...');
      const programsResult = await db.funding_programs.deleteMany({});
      console.log(`   ✓ Deleted ${programsResult.count.toLocaleString()} funding programs`);
    }

    // 3. Delete scraping_jobs last
    if (jobsCount > 0) {
      console.log('   Deleting scraping_jobs...');
      const jobsResult = await db.scraping_jobs.deleteMany({});
      console.log(`   ✓ Deleted ${jobsResult.count.toLocaleString()} scraping jobs`);
    }

    console.log();

    // Verify deletion
    const jobsAfter = await db.scraping_jobs.count();
    const programsAfter = await db.funding_programs.count();
    const logsAfter = await db.extraction_logs.count();

    console.log('📊 Records after deletion:');
    console.log(`   scraping_jobs: ${jobsAfter}`);
    console.log(`   funding_programs: ${programsAfter}`);
    console.log(`   extraction_logs: ${logsAfter}`);
    console.log();

    if (jobsAfter === 0 && programsAfter === 0 && logsAfter === 0) {
      console.log('✅ SUCCESS: All scraping data cleared');
      console.log('   Ready for fresh scraping with updated code\n');
    } else {
      console.log('⚠️  WARNING: Some records remain after deletion');
      console.log(`   scraping_jobs: ${jobsAfter}`);
      console.log(`   funding_programs: ${programsAfter}`);
      console.log(`   extraction_logs: ${logsAfter}\n`);
    }
  } catch (error: any) {
    console.error('❌ Error clearing scraping data:', error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

clearAllScrapingData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Cleanup failed:', error);
    process.exit(1);
  });
