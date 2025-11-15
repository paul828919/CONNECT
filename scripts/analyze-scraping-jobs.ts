import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const envType = process.env.ENV_TYPE || 'LOCAL';

  console.log(`🕒 ${envType} Environment - Scraping Jobs Analysis\n`);
  console.log('═'.repeat(80));

  // Check if scraping_jobs table exists and query
  try {
    const totalJobs = await prisma.scraping_jobs.count();
    console.log(`📊 Total Scraping Jobs: ${totalJobs}`);

    // Status breakdown
    const byStatus = await prisma.scraping_jobs.groupBy({
      by: ['scrapingStatus', 'processingStatus'],
      _count: { id: true }
    });
    console.log('\n📋 Jobs by Status:');
    byStatus.forEach(s => {
      console.log(`   Scraping: ${s.scrapingStatus} | Processing: ${s.processingStatus} → Count: ${s._count.id}`);
    });

    const recentJobs = await prisma.scraping_jobs.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        announcementTitle: true,
        scrapingStatus: true,
        processingStatus: true,
        scrapedAt: true,
        processedAt: true,
        scrapingError: true,
        processingError: true
      }
    });

    console.log('\n📅 10 Most Recent Scraping Jobs:');

    if (recentJobs.length === 0) {
      console.log('   ⚠️  No scraping jobs found');
    } else {
      recentJobs.forEach((job, idx) => {
        const duration = job.processedAt && job.scrapedAt
          ? Math.round((job.processedAt.getTime() - job.scrapedAt.getTime()) / 1000)
          : null;

        console.log(`${idx + 1}. ${job.announcementTitle.substring(0, 50)}...`);
        console.log(`   Scraping: [${job.scrapingStatus}] | Processing: [${job.processingStatus}]`);
        console.log(`   Scraped: ${job.scrapedAt.toISOString()}`);
        console.log(`   Processed: ${job.processedAt?.toISOString() || 'N/A'}`);
        if (duration) console.log(`   Duration: ${duration}s`);
        if (job.scrapingError) console.log(`   Scraping Error: ${job.scrapingError.substring(0, 80)}...`);
        if (job.processingError) console.log(`   Processing Error: ${job.processingError.substring(0, 80)}...`);
        console.log('');
      });
    }

    // Last successful job
    const lastSuccess = await prisma.scraping_jobs.findFirst({
      where: {
        scrapingStatus: 'COMPLETED',
        processingStatus: 'COMPLETED'
      },
      orderBy: { processedAt: 'desc' },
      select: {
        scrapedAt: true,
        processedAt: true,
        announcementTitle: true
      }
    });

    if (lastSuccess) {
      console.log('✅ Last Successful Scrape + Processing:');
      console.log(`   Scraped: ${lastSuccess.scrapedAt.toISOString()}`);
      console.log(`   Processed: ${lastSuccess.processedAt?.toISOString()}`);
      console.log(`   Title: ${lastSuccess.announcementTitle.substring(0, 60)}...`);
    } else {
      console.log('⚠️  No fully successful scraping jobs found');
    }

  } catch (error: any) {
    console.log('❌ Error querying scraping_jobs:');
    console.log(`   ${error.message}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
