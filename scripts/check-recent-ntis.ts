/**
 * Check Recent NTIS Programs
 * Verifies that the latest scraped programs have correct data
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Connecting to database...\n');

    // Get most recent NTIS programs
    const programs = await prisma.funding_programs.findMany({
      where: {
        scrapingSource: 'ntis',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        title: true,
        announcementUrl: true,
        deadline: true,
        publishedAt: true,
        scrapingSource: true,
        createdAt: true,
      },
    });

    console.log(`\n📋 Most Recent NTIS Programs (last 10):\n`);

    programs.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.title.substring(0, 70)}${p.title.length > 70 ? '...' : ''}`);
      console.log(`   URL: ${p.announcementUrl}`);
      console.log(`   Deadline: ${p.deadline?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Published: ${p.publishedAt?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Source: ${p.scrapingSource || 'N/A'}`);
      console.log(`   Created: ${p.createdAt.toISOString()}`);
      console.log('');
    });

    // Count by source
    const counts = await prisma.funding_programs.groupBy({
      by: ['scrapingSource'],
      _count: true,
    });

    console.log('📊 Program counts by scraping source:');
    counts.forEach(c => {
      console.log(`   ${c.scrapingSource || 'NULL'}: ${c._count}`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
