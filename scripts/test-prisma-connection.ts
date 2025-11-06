import { PrismaClient } from '@prisma/client';

async function quickTest() {
  const prisma = new PrismaClient();

  try {
    console.log('Testing Prisma connection...');
    const count = await prisma.funding_programs.count();
    console.log(`✅ Total programs: ${count}`);

    const ntisCount = await prisma.funding_programs.count({ where: { source: 'NTIS' } });
    console.log(`✅ NTIS programs: ${ntisCount}`);

    const recentCount = await prisma.funding_programs.count({
      where: {
        source: 'NTIS',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });
    console.log(`✅ Programs added in last 24h: ${recentCount}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickTest();
