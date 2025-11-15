/**
 * Production Cleanup Script - Delete All Scraping Jobs
 *
 * This script deletes all records from the scraping_jobs table
 * and verifies the deletion was successful.
 */

import { db } from '@/lib/db';

async function cleanupScrapingJobs() {
  console.log('🔍 Checking current scraping_jobs count...');
  const beforeCount = await db.scrapingJob.count();
  console.log(`   Found ${beforeCount} scraping jobs`);

  console.log('\n🗑️  Deleting all scraping_jobs...');
  const result = await db.scrapingJob.deleteMany({});
  console.log(`   ✅ Deleted ${result.count} scraping jobs`);

  console.log('\n✓ Verifying deletion...');
  const afterCount = await db.scrapingJob.count();
  console.log(`   Remaining scraping jobs: ${afterCount}`);

  if (afterCount === 0) {
    console.log('\n✅ SUCCESS: scraping_jobs table is now empty');
  } else {
    console.log('\n⚠️  WARNING: Some records remain in scraping_jobs table');
  }

  await db.$disconnect();
}

cleanupScrapingJobs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  });
