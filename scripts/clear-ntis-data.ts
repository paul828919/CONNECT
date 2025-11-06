import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearNTISData() {
  console.log('🗑️  Starting NTIS data deletion...\n');

  try {
    // Count records before deletion
    const countBefore = await prisma.supportProgram.count({
      where: { dataSource: 'NTIS' }
    });
    console.log(`📊 Found ${countBefore} NTIS programs in database\n`);

    if (countBefore === 0) {
      console.log('✅ Database is already clean - no NTIS data to delete\n');
      await prisma.$disconnect();
      return;
    }

    // Delete all NTIS programs (cascade will handle related records)
    console.log(`🗑️  Deleting ${countBefore} NTIS programs...`);
    const result = await prisma.supportProgram.deleteMany({
      where: { dataSource: 'NTIS' }
    });

    console.log(`\n✅ Deleted ${result.count} NTIS programs`);
    console.log('   (Related matches, saved programs, etc. were cascade-deleted)\n');

    // Verify deletion
    const countAfter = await prisma.supportProgram.count({
      where: { dataSource: 'NTIS' }
    });

    if (countAfter === 0) {
      console.log('✅ VERIFICATION PASSED - Database is now clean\n');
    } else {
      console.log(`⚠️  WARNING - ${countAfter} NTIS programs still remain\n`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
  
  await prisma.$disconnect();
}

clearNTISData();
