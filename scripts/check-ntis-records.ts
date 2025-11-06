/**
 * Check current NTIS records in database
 * Verifies data quality before cleanup and re-scrape
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkNTISRecords() {
  console.log('📊 Checking current NTIS records in database...\n');

  // Count total NTIS records
  const total = await db.funding_programs.count({
    where: { scrapingSource: 'ntis' }
  });

  console.log(`Total NTIS records: ${total}`);

  // Count by data completeness
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

  console.log(`\nData quality breakdown:`);
  console.log(`  With publishedAt: ${withPublishedAt}/${total} (${Math.round(withPublishedAt/total*100)}%)`);
  console.log(`  With deadline: ${withDeadline}/${total} (${Math.round(withDeadline/total*100)}%)`);
  console.log(`  With budgetAmount: ${withBudget}/${total} (${Math.round(withBudget/total*100)}%)`);

  // Show sample records
  const samples = await db.funding_programs.findMany({
    where: { scrapingSource: 'ntis' },
    select: {
      title: true,
      publishedAt: true,
      deadline: true,
      budgetAmount: true,
      announcementUrl: true
    },
    take: 3
  });

  console.log(`\n📝 Sample records:`);
  samples.forEach((record, i) => {
    console.log(`\n${i+1}. ${record.title?.substring(0, 50)}...`);
    console.log(`   publishedAt: ${record.publishedAt || 'NULL'}`);
    console.log(`   deadline: ${record.deadline || 'NULL'}`);
    console.log(`   budgetAmount: ${record.budgetAmount || 'NULL'}`);
    console.log(`   URL: ${record.announcementUrl}`);
  });

  await db.$disconnect();
}

checkNTISRecords().catch(console.error);
