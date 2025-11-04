/**
 * Database Cleanup Script
 *
 * Purpose: Delete all data from scraping_jobs and funding_programs tables
 * Context: Preparing for enhanced eligibility extraction implementation
 *
 * Steps:
 * 1. Count existing records before deletion
 * 2. Delete all records from scraping_jobs
 * 3. Delete all records from funding_programs
 * 4. Verify deletion with count queries
 * 5. Report results
 */

import { db } from '../lib/db';

async function cleanupDatabase() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Database Cleanup: Scraping Jobs & Funding Programs');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Step 1: Count existing records
    console.log('📊 Counting existing records...');
    const scrapingJobsCount = await db.scraping_jobs.count();
    const fundingProgramsCount = await db.funding_programs.count();

    console.log(`  - scraping_jobs: ${scrapingJobsCount} records`);
    console.log(`  - funding_programs: ${fundingProgramsCount} records`);
    console.log('');

    if (scrapingJobsCount === 0 && fundingProgramsCount === 0) {
      console.log('✓ Both tables are already empty. No cleanup needed.');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════════════════');
      return;
    }

    // Step 2: Delete all records from scraping_jobs
    console.log('🗑️  Deleting all records from scraping_jobs...');
    const deletedJobs = await db.scraping_jobs.deleteMany({});
    console.log(`  ✓ Deleted ${deletedJobs.count} records from scraping_jobs`);
    console.log('');

    // Step 3: Delete all records from funding_programs
    console.log('🗑️  Deleting all records from funding_programs...');
    const deletedPrograms = await db.funding_programs.deleteMany({});
    console.log(`  ✓ Deleted ${deletedPrograms.count} records from funding_programs`);
    console.log('');

    // Step 4: Verify deletion
    console.log('✅ Verifying deletion...');
    const remainingJobs = await db.scraping_jobs.count();
    const remainingPrograms = await db.funding_programs.count();

    console.log(`  - scraping_jobs: ${remainingJobs} records remaining`);
    console.log(`  - funding_programs: ${remainingPrograms} records remaining`);
    console.log('');

    // Step 5: Report results
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 CLEANUP SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');

    if (remainingJobs === 0 && remainingPrograms === 0) {
      console.log('✅ DATABASE CLEANUP: SUCCESS');
      console.log('');
      console.log(`   Deleted Records:`);
      console.log(`   - scraping_jobs: ${deletedJobs.count}`);
      console.log(`   - funding_programs: ${deletedPrograms.count}`);
      console.log('');
      console.log('   Both tables are now empty and ready for new data.');
    } else {
      console.log('❌ DATABASE CLEANUP: FAILED');
      console.log('');
      console.log(`   Remaining Records:`);
      console.log(`   - scraping_jobs: ${remainingJobs}`);
      console.log(`   - funding_programs: ${remainingPrograms}`);
      console.log('');
      console.log('   Some records were not deleted. Please investigate.');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Database cleanup failed:', error.message);
    console.error('');
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.meta) {
      console.error(`   Error Details: ${JSON.stringify(error.meta, null, 2)}`);
    }
    console.error('');
    throw error;
  }
}

// Run cleanup
cleanupDatabase()
  .then(() => {
    console.log('Database cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database cleanup failed:', error);
    process.exit(1);
  });
