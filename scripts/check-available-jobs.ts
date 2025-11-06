import { db } from '../lib/db';

async function main() {
  // Check total jobs
  const total = await db.scraping_jobs.count();
  console.log(`Total jobs in database: ${total}`);

  // Check date range
  const dates = await db.scraping_jobs.aggregate({
    _min: { scrapedAt: true },
    _max: { scrapedAt: true }
  });

  console.log(`\nDate range:`);
  console.log(`  Earliest: ${dates._min.scrapedAt}`);
  console.log(`  Latest: ${dates._max.scrapedAt}`);

  // Check status distribution
  const stats = await db.scraping_jobs.groupBy({
    by: ['processingStatus'],
    _count: true
  });

  console.log(`\nProcessing Status Distribution:`);
  stats.forEach(s => {
    console.log(`  ${s.processingStatus}: ${s._count}`);
  });

  // Check PENDING jobs
  const pending = await db.scraping_jobs.findMany({
    where: { processingStatus: 'PENDING' },
    select: {
      id: true,
      announcementTitle: true,
      scrapedAt: true,
      attachmentCount: true
    },
    take: 5,
    orderBy: { scrapedAt: 'desc' }
  });

  console.log(`\nSample PENDING jobs (showing first 5):`);
  pending.forEach(j => {
    console.log(`  ${j.id.substring(0, 8)}... | ${j.announcementTitle.substring(0, 50)} | ${j.scrapedAt.toISOString().split('T')[0]} | ${j.attachmentCount} files`);
  });

  await db.$disconnect();
}

main().catch(console.error);
