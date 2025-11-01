import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearNTISTestData() {
  try {
    console.log('🗑️  Clearing NTIS test data...\n');

    // Delete all NTIS scraping jobs (identified by ntis.go.kr URL)
    const result = await prisma.scraping_jobs.deleteMany({
      where: {
        announcementUrl: {
          contains: 'ntis.go.kr',
        },
      },
    });

    console.log(`✅ Deleted ${result.count} NTIS scraping jobs from database`);
    console.log('✓ Ready for fresh testing\n');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearNTISTestData();
