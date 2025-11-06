import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testScraperIsolation() {
  const testId = `test-${Date.now()}`;
  const runnerEnv = process.env.RUNNER || 'unknown';

  console.log(`\n🧪 Testing from: ${runnerEnv}`);
  console.log(`📝 Test ID: ${testId}`);

  try {
    // Create a test program
    const program = await prisma.funding_programs.create({
      data: {
        id: testId,
        agencyId: 'NTIS',
        title: `[TEST] Data Isolation Test - ${runnerEnv}`,
        description: `This test program was created by ${runnerEnv} to verify data sharing between scraper container and dev server.`,
        announcementUrl: `https://test.example.com/${testId}`,
        contentHash: testId,
        scrapedAt: new Date(),
        announcementType: 'R_D_PROJECT',
      },
    });

    console.log(`✅ Successfully created test program:`);
    console.log(`   ID: ${program.id}`);
    console.log(`   Title: ${program.title}`);
    console.log(`   Created by: ${runnerEnv}`);

    // Count all test programs
    const testCount = await prisma.funding_programs.count({
      where: { title: { startsWith: '[TEST] Data Isolation Test' } },
    });

    console.log(`\n📊 Total test programs visible: ${testCount}`);
    console.log(`   (This count includes programs created by both scraper container and dev server)`);

    // List all test programs
    const allTests = await prisma.funding_programs.findMany({
      where: { title: { startsWith: '[TEST] Data Isolation Test' } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n📋 All test programs in database:`);
    allTests.forEach((test, idx) => {
      const runner = test.title.includes('scraper') ? '🐳 Scraper Container' : '💻 Dev Server';
      console.log(`   ${idx + 1}. ${runner} - ${test.id.substring(0, 20)}... (${test.createdAt.toISOString()})`);
    });

    console.log(`\n✅ Test completed successfully!`);
    console.log(`   If you can see programs from both sources, data is shared correctly.`);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testScraperIsolation();
