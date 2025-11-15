/**
 * Check scrapingSource values of EXPIRED programs
 *
 * Diagnostic script to identify filtering issues
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkScrapingSources() {
  console.log('🔍 Checking scrapingSource values of EXPIRED programs...\n');

  try {
    // 1. Count EXPIRED programs by scrapingSource
    const scrapingSources = await db.funding_programs.groupBy({
      by: ['scrapingSource'],
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
      },
      _count: {
        scrapingSource: true,
      },
    });

    console.log('📊 EXPIRED R&D programs by scrapingSource:');
    scrapingSources.forEach(({ scrapingSource, _count }) => {
      console.log(`   - ${scrapingSource || 'NULL'}: ${_count.scrapingSource}`);
    });

    // 2. Check how many would be excluded by current filter
    const excludedByFilter = await db.funding_programs.count({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          in: ['NTIS_API'],
        },
      },
    });

    console.log(`\n❌ Programs EXCLUDED by current filter (scrapingSource: NTIS_API): ${excludedByFilter}`);

    // 3. Check how many would pass the filter
    const passedByFilter = await db.funding_programs.count({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
    });

    console.log(`✅ Programs INCLUDED by current filter: ${passedByFilter}`);

    // 4. Show samples that pass filter
    if (passedByFilter > 0) {
      console.log('\n📋 Sample programs that PASS the filter:');
      const samples = await db.funding_programs.findMany({
        where: {
          status: ProgramStatus.EXPIRED,
          announcementType: AnnouncementType.R_D_PROJECT,
          scrapingSource: {
            not: null,
            notIn: ['NTIS_API'],
          },
        },
        select: {
          id: true,
          title: true,
          agencyId: true,
          scrapingSource: true,
          deadline: true,
        },
        take: 5,
        orderBy: {
          deadline: 'desc',
        },
      });

      samples.forEach((program, idx) => {
        console.log(`\n   ${idx + 1}. ${program.title.substring(0, 80)}...`);
        console.log(`      Agency: ${program.agencyId}`);
        console.log(`      ScrapingSource: ${program.scrapingSource}`);
        console.log(`      Deadline: ${program.deadline?.toLocaleDateString('ko-KR') || 'N/A'}`);
      });
    } else {
      console.log('\n❌ NO programs pass the current filter!');
      console.log('   This is the ROOT CAUSE of the issue!\n');
      console.log('💡 Solution Options:');
      console.log('   1. Remove or relax the scrapingSource filter');
      console.log('   2. Update scrapingSource values in database');
      console.log('   3. Change filter logic to be more inclusive');
    }

    // 5. Show NULL scrapingSource programs
    const nullSourceCount = await db.funding_programs.count({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: null,
      },
    });

    if (nullSourceCount > 0) {
      console.log(`\n⚠️  Programs with NULL scrapingSource: ${nullSourceCount}`);
      console.log('   Current filter excludes these (scrapingSource: { not: null })');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkScrapingSources();
