import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 Checking database for programs...\n');

  try {
    // Get all programs
    const allPrograms = await prisma.funding_programs.findMany({
      orderBy: { scrapedAt: 'desc' },
      take: 10,
    });

    console.log(`Total programs in database: ${await prisma.funding_programs.count()}`);
    console.log(`Recent programs (latest 10):\n`);

    for (const program of allPrograms) {
      console.log(`─────────────────────────────────────────────────────────`);
      console.log(`ID: ${program.id}`);
      console.log(`Agency: ${program.agencyId}`);
      console.log(`Title: ${program.title.substring(0, 60)}${program.title.length > 60 ? '...' : ''}`);
      console.log(`URL: ${program.announcementUrl}`);
      console.log(`Scraped: ${program.scrapedAt.toISOString()}`);
      console.log(`Status: ${program.status}`);
      console.log(`Type: ${program.announcementType}`);
    }

    // Check by agency
    console.log('\n\n📊 Programs by Agency:');
    console.log('─────────────────────────────────────────────────────────');
    const agencies = ['NTIS', 'IITP', 'KEIT', 'TIPA', 'KIMST'];
    for (const agency of agencies) {
      const count = await prisma.funding_programs.count({
        where: { agencyId: agency as any },
      });
      console.log(`${agency}: ${count}`);
    }

    // Check NTIS programs specifically
    console.log('\n\n🔎 NTIS Programs Details:');
    console.log('─────────────────────────────────────────────────────────');
    const ntisPrograms = await prisma.funding_programs.findMany({
      where: { agencyId: 'NTIS' },
      orderBy: { scrapedAt: 'desc' },
      take: 5,
    });

    console.log(`Total NTIS programs: ${await prisma.funding_programs.count({ where: { agencyId: 'NTIS' } })}`);

    if (ntisPrograms.length > 0) {
      console.log('\nSample NTIS programs:');
      for (const program of ntisPrograms) {
        console.log(`\n  Title: ${program.title.substring(0, 80)}`);
        console.log(`  Scraped: ${program.scrapedAt.toISOString()}`);
        console.log(`  URL: ${program.announcementUrl}`);
      }
    }

    // Check date ranges
    console.log('\n\n📅 Date Range Analysis:');
    console.log('─────────────────────────────────────────────────────────');
    const oldestProgram = await prisma.funding_programs.findFirst({
      orderBy: { scrapedAt: 'asc' },
    });
    const newestProgram = await prisma.funding_programs.findFirst({
      orderBy: { scrapedAt: 'desc' },
    });

    if (oldestProgram && newestProgram) {
      console.log(`Oldest scrapedAt: ${oldestProgram.scrapedAt.toISOString()}`);
      console.log(`Newest scrapedAt: ${newestProgram.scrapedAt.toISOString()}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
