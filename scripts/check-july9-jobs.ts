import { db } from '../lib/db';

async function main() {
  const stats = await db.scraping_jobs.groupBy({
    by: ['processingStatus'],
    where: {
      scrapedAt: {
        gte: new Date('2025-07-09T00:00:00Z'),
        lt: new Date('2025-07-10T00:00:00Z')
      }
    },
    _count: true
  });

  console.log('Job Status Distribution (July 9):');
  stats.forEach(s => {
    console.log(`  ${s.processingStatus}: ${s._count}`);
  });

  await db.$disconnect();
}

main().catch(console.error);
