/**
 * Cleanup Script: Delete Programs with NULL Deadlines
 *
 * Deletes TIPA and KIMST programs that have NULL deadlines due to parser bugs.
 * Also deletes associated matches to maintain referential integrity.
 *
 * Target:
 * - 30 TIPA programs with NULL deadlines
 * - 10 KIMST programs with NULL deadlines
 * - Associated matches to those programs
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🧹 Starting cleanup of programs with NULL deadlines...\n');

  try {
    // 1. Find TIPA programs with NULL deadlines
    console.log('📊 Step 1: Finding TIPA programs with NULL deadlines...');
    const tipaPrograms = await db.funding_programs.findMany({
      where: {
        agencyId: 'TIPA',
        deadline: null,
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
      },
    });

    console.log(`   Found ${tipaPrograms.length} TIPA programs with NULL deadlines`);
    if (tipaPrograms.length > 0) {
      console.log('   Sample titles:');
      tipaPrograms.slice(0, 3).forEach((p) => {
        console.log(`   - ${p.title}`);
      });
    }

    // 2. Find KIMST programs with NULL deadlines
    console.log('\n📊 Step 2: Finding KIMST programs with NULL deadlines...');
    const kimstPrograms = await db.funding_programs.findMany({
      where: {
        agencyId: 'KIMST',
        deadline: null,
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
      },
    });

    console.log(`   Found ${kimstPrograms.length} KIMST programs with NULL deadlines`);
    if (kimstPrograms.length > 0) {
      console.log('   Sample titles:');
      kimstPrograms.slice(0, 3).forEach((p) => {
        console.log(`   - ${p.title}`);
      });
    }

    // 3. Collect all program IDs to delete
    const programIdsToDelete = [
      ...tipaPrograms.map((p) => p.id),
      ...kimstPrograms.map((p) => p.id),
    ];

    console.log(`\n📊 Total programs to delete: ${programIdsToDelete.length}`);

    if (programIdsToDelete.length === 0) {
      console.log('✅ No programs found with NULL deadlines. Cleanup not needed.');
      return;
    }

    // 4. Delete associated matches first (foreign key constraint)
    console.log('\n🗑️  Step 3: Deleting associated matches...');
    const deleteMatchesResult = await db.funding_matches.deleteMany({
      where: {
        programId: {
          in: programIdsToDelete,
        },
      },
    });

    console.log(`   Deleted ${deleteMatchesResult.count} associated matches`);

    // 5. Delete the programs
    console.log('\n🗑️  Step 4: Deleting programs...');
    const deleteProgramsResult = await db.funding_programs.deleteMany({
      where: {
        id: {
          in: programIdsToDelete,
        },
      },
    });

    console.log(`   Deleted ${deleteProgramsResult.count} programs`);

    // 6. Summary
    console.log('\n✅ Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - TIPA programs deleted: ${tipaPrograms.length}`);
    console.log(`   - KIMST programs deleted: ${kimstPrograms.length}`);
    console.log(`   - Total programs deleted: ${deleteProgramsResult.count}`);
    console.log(`   - Associated matches deleted: ${deleteMatchesResult.count}`);
    console.log('\n💡 Next step: Run rescraping job to populate these programs with correct deadlines');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
