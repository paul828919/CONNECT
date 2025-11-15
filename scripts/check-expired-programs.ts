/**
 * Check Database for EXPIRED Programs
 *
 * Diagnostic script to verify if historical matching can work.
 * The historical matching feature requires programs with status='EXPIRED'.
 */

import { PrismaClient, ProgramStatus, AnnouncementType } from '@prisma/client';

const db = new PrismaClient({
  log: ['error', 'warn'],
});

async function checkExpiredPrograms() {
  console.log('🔍 Checking database for EXPIRED programs...\n');

  try {
    // 1. Count total programs
    const totalPrograms = await db.funding_programs.count();
    console.log(`📊 Total programs in database: ${totalPrograms}`);

    // 2. Count programs by status
    const statusCounts = await db.funding_programs.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    console.log('\n📋 Programs by status:');
    statusCounts.forEach(({ status, _count }) => {
      console.log(`   - ${status}: ${_count.status}`);
    });

    // 3. Count EXPIRED R&D programs (what historical matching needs)
    const expiredRdPrograms = await db.funding_programs.count({
      where: {
        status: ProgramStatus.EXPIRED,
        announcementType: AnnouncementType.R_D_PROJECT,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      },
    });

    console.log(`\n🎯 EXPIRED R&D programs (needed for historical matching): ${expiredRdPrograms}`);

    // 4. Sample expired programs
    if (expiredRdPrograms > 0) {
      console.log('\n✅ Sample EXPIRED programs:');
      const samples = await db.funding_programs.findMany({
        where: {
          status: ProgramStatus.EXPIRED,
          announcementType: AnnouncementType.R_D_PROJECT,
        },
        select: {
          id: true,
          title: true,
          agencyId: true,
          deadline: true,
          publishedAt: true,
        },
        take: 5,
        orderBy: {
          publishedAt: 'desc',
        },
      });

      samples.forEach((program, idx) => {
        console.log(`\n   ${idx + 1}. ${program.title}`);
        console.log(`      Agency: ${program.agencyId}`);
        console.log(`      Deadline: ${program.deadline?.toLocaleDateString('ko-KR') || 'N/A'}`);
        console.log(`      Published: ${program.publishedAt?.toLocaleDateString('ko-KR') || 'N/A'}`);
      });
    } else {
      console.log('\n❌ No EXPIRED R&D programs found!');
      console.log('   This is why historical matching doesn\'t work.');
      console.log('\n💡 Diagnosis:');
      console.log('   - Programs need to be marked as EXPIRED (not just past deadline)');
      console.log('   - This should happen automatically via a cron job or script');
      console.log('   - Check if status update mechanism is working');
    }

    // 5. Check programs with past deadlines but still ACTIVE
    const pastDeadlineActive = await db.funding_programs.count({
      where: {
        status: ProgramStatus.ACTIVE,
        deadline: {
          lt: new Date(),
        },
      },
    });

    if (pastDeadlineActive > 0) {
      console.log(`\n⚠️  Programs with past deadlines but still ACTIVE: ${pastDeadlineActive}`);
      console.log('   These should be automatically marked as EXPIRED!');

      const samples = await db.funding_programs.findMany({
        where: {
          status: ProgramStatus.ACTIVE,
          deadline: {
            lt: new Date(),
          },
        },
        select: {
          id: true,
          title: true,
          deadline: true,
        },
        take: 5,
        orderBy: {
          deadline: 'desc',
        },
      });

      console.log('\n   Sample programs that should be EXPIRED:');
      samples.forEach((program, idx) => {
        const daysAgo = Math.floor(
          (new Date().getTime() - program.deadline!.getTime()) / (1000 * 60 * 60 * 24)
        );
        console.log(`   ${idx + 1}. ${program.title}`);
        console.log(`      Deadline: ${program.deadline?.toLocaleDateString('ko-KR')} (${daysAgo} days ago)`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await db.$disconnect();
  }
}

checkExpiredPrograms();
