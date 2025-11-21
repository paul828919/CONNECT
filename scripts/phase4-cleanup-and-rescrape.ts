/**
 * Phase 4: Clean Database and Re-scrape
 *
 * PURPOSE:
 * Remove existing NTIS records scraped with broken parser (0% extraction success)
 * and trigger new scraping job to populate database with correctly extracted data
 *
 * EXECUTION:
 * Run this script on production server OR with production DATABASE_URL:
 * DATABASE_URL="postgresql://connect@59.21.170.6:5432/connect?schema=public" npx tsx scripts/phase4-cleanup-and-rescrape.ts
 *
 * SAFE GUARDS:
 * - Only deletes NTIS records (scrapingSource = 'ntis')
 * - Preserves seed data and other agency data
 * - Shows counts before/after for verification
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';

const db = new PrismaClient();

async function phase4Cleanup() {
  console.log('🧹 Phase 4: Database Cleanup and Re-scrape\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Check current state
    console.log('\n📊 Step 1: Checking current database state...\n');

    const totalNTIS = await db.funding_programs.count({
      where: { scrapingSource: 'ntis' }
    });

    const withPublishedAt = await db.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
        publishedAt: { not: null }
      }
    });

    const withDeadline = await db.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
        deadline: { not: null }
      }
    });

    const withBudget = await db.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
        budgetAmount: { not: null }
      }
    });

    console.log(`Total NTIS records: ${totalNTIS}`);
    console.log(`  With publishedAt: ${withPublishedAt}/${totalNTIS} (${totalNTIS > 0 ? Math.round(withPublishedAt/totalNTIS*100) : 0}%)`);
    console.log(`  With deadline: ${withDeadline}/${totalNTIS} (${totalNTIS > 0 ? Math.round(withDeadline/totalNTIS*100) : 0}%)`);
    console.log(`  With budgetAmount: ${withBudget}/${totalNTIS} (${totalNTIS > 0 ? Math.round(withBudget/totalNTIS*100) : 0}%)`);

    // Step 2: Delete existing NTIS records
    console.log('\n🗑️  Step 2: Deleting existing NTIS records...\n');

    // First delete related funding_matches to avoid foreign key constraint
    const deletedMatches = await db.funding_matches.deleteMany({
      where: {
        funding_programs: {
          scrapingSource: 'ntis'
        }
      }
    });

    console.log(`Deleted ${deletedMatches.count} related funding_matches`);

    // Then delete funding_programs
    const deletedPrograms = await db.funding_programs.deleteMany({
      where: {
        scrapingSource: 'ntis'
      }
    });

    console.log(`Deleted ${deletedPrograms.count} NTIS funding_programs`);

    // Step 3: Verify cleanup
    console.log('\n✅ Step 3: Verifying cleanup...\n');

    const remainingNTIS = await db.funding_programs.count({
      where: { scrapingSource: 'ntis' }
    });

    console.log(`Remaining NTIS records: ${remainingNTIS}`);

    if (remainingNTIS === 0) {
      console.log('✅ Cleanup successful - all NTIS records removed');
    } else {
      console.warn(`⚠️  Warning: ${remainingNTIS} NTIS records still remain`);
    }

    // Step 4: Queue new NTIS scraping job
    console.log('\n🚀 Step 4: Queueing new NTIS scraping job...\n');

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    const scrapingQueue = new Queue('scraping-jobs', {
      connection: redisConfig,
    });

    // Queue NTIS scraping job (first 10 pages = 100 announcements)
    const job = await scrapingQueue.add('ntis-scrape', {
      agencyId: 'ntis',
      maxPages: 10,
      timestamp: new Date().toISOString(),
    }, {
      attempts: 3, // Retry up to 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 60000, // Start with 1 minute delay
      },
    });

    console.log(`✅ NTIS scraping job queued: ${job.id}`);
    console.log(`   Target: First 10 pages (100 announcements)`);
    console.log(`   Expected extraction: 80%+ for publishedAt, 60%+ for deadline`);

    await scrapingQueue.close();

    // Step 5: Instructions
    console.log('\n' + '='.repeat(80));
    console.log('📋 Next Steps:\n');
    console.log('1. Monitor scraping logs:');
    console.log('   docker logs -f connect-scraper-1 --tail 100');
    console.log('');
    console.log('2. After scraping completes (~10 minutes), verify results:');
    console.log('   npx tsx scripts/phase5-verify-data-quality.ts');
    console.log('');
    console.log('3. Expected results:');
    console.log('   - ~100 new NTIS announcements');
    console.log('   - publishedAt: 80-90% extraction success');
    console.log('   - deadline: 60-70% extraction success');
    console.log('   - budgetAmount: 30-40% extraction (many are NULL = "0억원")');
    console.log('='.repeat(80));

    await db.$disconnect();

  } catch (error: any) {
    console.error('❌ Phase 4 failed:', error.message);
    await db.$disconnect();
    throw error;
  }
}

phase4Cleanup().catch(console.error);
