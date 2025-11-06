/**
 * Verify NTIS Data
 *
 * Quick verification that NTIS-only scraping populated the database correctly
 */

import { db } from '@/lib/db';

async function verifyData() {
  const programs = await db.funding_programs.findMany({
    select: {
      title: true,
      deadline: true,
      scrapingSource: true,
      targetType: true,
      scrapedAt: true
    },
    orderBy: { scrapedAt: 'desc' },
    take: 10
  });

  console.log('\n📊 Latest 10 Funding Programs (NTIS-only):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  programs.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title.substring(0, 60)}...`);
    console.log(`   Deadline: ${p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : 'none'}`);
    console.log(`   Source: ${p.scrapingSource}`);
    console.log(`   Target: ${p.targetType}`);
    console.log(`   Scraped: ${new Date(p.scrapedAt).toISOString()}`);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Total programs: ${programs.length}`);
  console.log(`✅ Deadlines extracted: ${programs.filter(p => p.deadline).length}/${programs.length}`);
  console.log(`✅ Deadline extraction rate: ${((programs.filter(p => p.deadline).length / programs.length) * 100).toFixed(0)}%`);

  await db.$disconnect();
}

verifyData();
