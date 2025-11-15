import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkStatus() {
  try {
    const stats = await db.scrapingJob.groupBy({
      by: ['processingStatus'],
      _count: true,
    });

    const total = await db.scrapingJob.count();

    console.log('');
    console.log('📊 Scraping Jobs Status:');
    console.log('═════════════════════════════════════');
    stats.forEach((s) => {
      console.log(`  ${s.processingStatus}: ${s._count}`);
    });
    console.log('─────────────────────────────────────');
    console.log(`  TOTAL: ${total}`);
    console.log('═════════════════════════════════════');
    console.log('');

    const pending = stats.find((s) => s.processingStatus === 'PENDING')?._count || 0;
    const completed = stats.find((s) => s.processingStatus === 'COMPLETED')?._count || 0;
    const failed = stats.find((s) => s.processingStatus === 'FAILED')?._count || 0;

    if (pending > 0) {
      console.log(`✅ ${pending} jobs remaining to process`);
      console.log(`💡 Suggested command to process next batch:`);
      console.log('');
      console.log(`   docker exec -it connect_dev_scraper npx tsx scripts/scrape-ntis-processor.ts --maxJobs 100`);
      console.log('');
    } else {
      console.log('✅ All jobs have been processed!');
      console.log(`   Completed: ${completed}`);
      console.log(`   Failed: ${failed}`);
    }

    await db.$disconnect();
  } catch (error) {
    console.error('Error checking job status:', error);
    await db.$disconnect();
    process.exit(1);
  }
}

checkStatus();
