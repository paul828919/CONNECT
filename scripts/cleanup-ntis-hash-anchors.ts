/**
 * Clean Up NTIS Hash Anchor Records
 * Removes contaminated records from Jobs 9-10 that have hash anchor URLs
 */

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🧹 Cleaning up NTIS records with hash anchor URLs...\n');

    // Find all NTIS records with hash anchors in announcementUrl
    const hashAnchorRecords = await prisma.funding_programs.findMany({
      where: {
        scrapingSource: 'ntis',
        announcementUrl: {
          contains: '#',
        },
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
        createdAt: true,
      },
    });

    if (hashAnchorRecords.length === 0) {
      console.log('✅ No hash anchor records found. Database is clean!');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log(`Found ${hashAnchorRecords.length} contaminated records:\n`);
    hashAnchorRecords.forEach((record, idx) => {
      console.log(`${idx + 1}. ${record.title}`);
      console.log(`   URL: ${record.announcementUrl}`);
      console.log(`   Created: ${record.createdAt.toISOString()}`);
      console.log('');
    });

    // Delete the contaminated records
    const deleteResult = await prisma.funding_programs.deleteMany({
      where: {
        scrapingSource: 'ntis',
        announcementUrl: {
          contains: '#',
        },
      },
    });

    console.log(`✅ Deleted ${deleteResult.count} contaminated records`);
    console.log('\n📊 Remaining NTIS records:');

    const remainingCount = await prisma.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
      },
    });

    console.log(`   Total: ${remainingCount} programs\n`);

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
