import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyNtisAnnouncementTypes() {
  console.log('🔍 Verifying NTIS Announcement Types in Database...\n');

  try {
    // 1. Count total NTIS programs
    const totalNtis = await prisma.funding_programs.count({
      where: { agencyId: 'NTIS' },
    });

    console.log(`📊 Total NTIS Programs: ${totalNtis}\n`);

    // 2. Group by announcementType to see distribution
    const typeDistribution = await prisma.funding_programs.groupBy({
      by: ['announcementType'],
      where: { agencyId: 'NTIS' },
      _count: { announcementType: true },
    });

    console.log('📋 Announcement Type Distribution:');
    console.log('═══════════════════════════════════════════════════════════');

    let rdProjectCount = 0;
    let nonRdCount = 0;

    for (const { announcementType, _count } of typeDistribution) {
      const percentage = (((_count.announcementType / totalNtis) * 100)).toFixed(1);
      const icon = announcementType === 'R_D_PROJECT' ? '✅' : '⚠️';

      console.log(`${icon} ${announcementType.padEnd(15)} ${_count.announcementType.toString().padStart(4)} (${percentage.padStart(5)}%)`);

      if (announcementType === 'R_D_PROJECT') {
        rdProjectCount = _count.announcementType;
      } else {
        nonRdCount += _count.announcementType;
      }
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ R&D Projects:     ${rdProjectCount} (${((rdProjectCount / totalNtis) * 100).toFixed(1)}%)`);
    console.log(`⚠️  Non-R&D Programs: ${nonRdCount} (${((nonRdCount / totalNtis) * 100).toFixed(1)}%)\n`);

    // 3. If non-R&D programs exist, show examples
    if (nonRdCount > 0) {
      console.log('⚠️  NON-R&D PROGRAM EXAMPLES:');
      console.log('═══════════════════════════════════════════════════════════');

      const nonRdPrograms = await prisma.funding_programs.findMany({
        where: {
          agencyId: 'NTIS',
          announcementType: { not: 'R_D_PROJECT' },
        },
        orderBy: { scrapedAt: 'desc' },
        take: 10,
      });

      for (const program of nonRdPrograms) {
        console.log(`\nType: ${program.announcementType}`);
        console.log(`Title: ${program.title.substring(0, 80)}${program.title.length > 80 ? '...' : ''}`);
        console.log(`URL: ${program.announcementUrl}`);
        console.log(`Scraped: ${program.scrapedAt.toISOString()}`);
      }
      console.log('\n');
    }

    // 4. Show 5 most recent programs (to verify latest scrape didn't add non-R&D)
    console.log('📅 5 Most Recent NTIS Programs:');
    console.log('═══════════════════════════════════════════════════════════');

    const recentPrograms = await prisma.funding_programs.findMany({
      where: { agencyId: 'NTIS' },
      orderBy: { scrapedAt: 'desc' },
      take: 5,
    });

    for (let i = 0; i < recentPrograms.length; i++) {
      const program = recentPrograms[i];
      const icon = program.announcementType === 'R_D_PROJECT' ? '✅' : '⚠️';

      console.log(`\n${i + 1}. ${icon} ${program.announcementType}`);
      console.log(`   Title: ${program.title.substring(0, 70)}${program.title.length > 70 ? '...' : ''}`);
      console.log(`   Scraped: ${program.scrapedAt.toISOString()}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');

    // 5. Final verdict
    if (nonRdCount === 0) {
      console.log('✅ VERIFICATION PASSED: All NTIS programs are R&D_PROJECT type!');
      console.log('   No non-R&D programs found in database.\n');
    } else {
      console.log(`⚠️  VERIFICATION FAILED: Found ${nonRdCount} non-R&D programs (${((nonRdCount / totalNtis) * 100).toFixed(1)}%)`);
      console.log('   These programs should have been filtered during scraping.\n');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyNtisAnnouncementTypes();
