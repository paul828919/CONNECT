/**
 * Clean Up Matches to Expired Programs
 *
 * Deletes funding_matches records that reference programs with status='EXPIRED'.
 * These are stale matches that were created before programs expired.
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function cleanupExpiredMatches() {
  console.log('🧹 Cleaning Up Matches to Expired Programs...\n');

  try {
    // Find all matches to expired programs
    const expiredMatches = await db.funding_matches.findMany({
      where: {
        funding_programs: {
          status: 'EXPIRED',
        },
      },
      include: {
        funding_programs: {
          select: {
            id: true,
            title: true,
            deadline: true,
            status: true,
          },
        },
      },
    });

    console.log(`📊 Found ${expiredMatches.length} matches to expired programs\n`);

    if (expiredMatches.length === 0) {
      console.log('✅ No stale matches found. Database is clean!');
      return;
    }

    // Show sample of matches to be deleted
    console.log('📋 Sample of Matches to be Deleted:');
    console.log('─'.repeat(80));
    expiredMatches.slice(0, 10).forEach((match, index) => {
      console.log(`${index + 1}. Match ID: ${match.id}`);
      console.log(`   Program: ${match.funding_programs.title}`);
      console.log(`   Deadline: ${match.funding_programs.deadline?.toISOString().split('T')[0]}`);
      console.log(`   Status: ${match.funding_programs.status}`);
      console.log(`   Score: ${match.score}\n`);
    });
    if (expiredMatches.length > 10) {
      console.log(`   ... and ${expiredMatches.length - 10} more\n`);
    }
    console.log('─'.repeat(80) + '\n');

    // Delete all matches to expired programs
    const result = await db.funding_matches.deleteMany({
      where: {
        funding_programs: {
          status: 'EXPIRED',
        },
      },
    });

    console.log(`✅ Deleted ${result.count} stale matches\n`);
    console.log('✅ Cleanup completed! Next step:');
    console.log('   Verify fix in browser: No expired programs should appear in match results\n');
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

cleanupExpiredMatches().catch(console.error);
