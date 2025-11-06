import { db } from '../lib/db';

async function main() {
  // Get recently created programs
  const programs = await db.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      scrapedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    select: {
      id: true,
      title: true,
      description: true,
      budgetAmount: true,
      minTrl: true,
      maxTrl: true,
      allowedBusinessStructures: true,
      announcementType: true,
      category: true,
      trlClassification: true,
      scrapedAt: true
    },
    orderBy: { scrapedAt: 'desc' },
    take: 10
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Found ${programs.length} programs extracted in the last 24 hours`);
  console.log(`${'='.repeat(80)}\n`);

  programs.forEach((p, index) => {
    console.log(`${index + 1}. ${p.title}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Type: ${p.announcementType}`);
    console.log(`   Category: ${p.category || 'N/A'}`);
    console.log(`   Budget: ${p.budgetAmount ? `₩${(p.budgetAmount / 100000000).toFixed(1)}억` : 'N/A'}`);
    console.log(`   TRL Range: ${p.minTrl !== null ? `${p.minTrl}-${p.maxTrl}` : 'N/A'}`);
    console.log(`   TRL Classification: ${p.trlClassification || 'N/A'}`);
    console.log(`   Business Structures: ${p.allowedBusinessStructures?.length > 0 ? p.allowedBusinessStructures.join(', ') : 'N/A'}`);
    console.log(`   Description: ${p.description ? p.description.substring(0, 150) + '...' : 'N/A'}`);
    console.log(`   Scraped: ${p.scrapedAt.toISOString()}`);
    console.log();
  });

  // Get extraction quality stats
  const stats = await db.funding_programs.aggregate({
    where: {
      scrapingSource: 'ntis',
      scrapedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    },
    _count: {
      id: true,
      budgetAmount: true,
      minTrl: true,
      category: true,
      description: true
    }
  });

  const totalCount = stats._count.id || 0;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Extraction Quality Statistics`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Programs: ${totalCount}`);
  console.log(`Budget Extracted: ${stats._count.budgetAmount}/${totalCount} (${((stats._count.budgetAmount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`TRL Extracted: ${stats._count.minTrl}/${totalCount} (${((stats._count.minTrl / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Category Extracted: ${stats._count.category}/${totalCount} (${((stats._count.category / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Description Extracted: ${stats._count.description}/${totalCount} (${((stats._count.description / totalCount) * 100).toFixed(1)}%)`);

  await db.$disconnect();
}

main().catch(console.error);
