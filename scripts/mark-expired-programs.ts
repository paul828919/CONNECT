/**
 * Mark Expired Programs as EXPIRED
 *
 * Updates program status from ACTIVE to EXPIRED when deadline < today.
 * This is a one-time migration script and should also be added to the scraper worker.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function markExpiredPrograms() {
  console.log('🔄 Marking Expired Programs...\n');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all programs with expired deadlines still marked as ACTIVE
    const expiredPrograms = await db.funding_programs.findMany({
      where: {
        deadline: { lt: today },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        status: true,
        scrapingSource: true,
      },
    });

    console.log(`📊 Found ${expiredPrograms.length} expired programs to update\n`);

    if (expiredPrograms.length === 0) {
      console.log('✅ No expired programs found. All programs are up to date.');
      return;
    }

    // Update all expired programs to EXPIRED status
    const result = await db.funding_programs.updateMany({
      where: {
        deadline: { lt: today },
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    console.log(`✅ Updated ${result.count} programs to EXPIRED status\n`);

    // Show details of updated programs
    console.log('📋 Updated Programs:');
    console.log('─'.repeat(80));
    expiredPrograms.forEach((program, index) => {
      console.log(`${index + 1}. ${program.title}`);
      console.log(`   Source: ${program.scrapingSource}`);
      console.log(`   Deadline: ${program.deadline?.toISOString().split('T')[0]}`);
      console.log(`   Status: ACTIVE → EXPIRED\n`);
    });
    console.log('─'.repeat(80));

    console.log('\n✅ Status update completed! Next steps:');
    console.log('   1. Update match generation to filter EXPIRED programs');
    console.log('   2. Clean up existing matches to expired programs');
    console.log('   3. Add status management to scraper worker for future updates\n');
  } catch (error: any) {
    console.error('❌ Failed to mark expired programs:', error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

markExpiredPrograms().catch(console.error);
