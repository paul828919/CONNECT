/**
 * Clean Up Matches to NOTICE Programs
 *
 * Deletes funding_matches records that reference programs with announcementType='NOTICE'.
 * NOTICE programs are procurement bids, policy research tenders, and general announcements
 * that should NEVER appear in match results (only R_D_PROJECT programs should match).
 *
 * Problem:
 * - Legacy matches were created before classification system was implemented
 * - API now correctly filters NOTICE programs (route.ts line 183)
 * - But old contaminated matches remain in database
 *
 * Solution:
 * - Delete all matches where funding_programs.announcementType = 'NOTICE'
 * - This is a one-time cleanup for legacy data
 * - Future matches will be prevented by API filtering
 *
 * Expected Impact:
 * - Kim Byung-jin's matches: 7 → 5 (removes 2 NOTICE programs)
 * - All users: Cleaner, more relevant match results
 *
 * Usage:
 * - Local: DATABASE_URL="..." npx tsx scripts/cleanup-notice-matches.ts
 * - Production: Run after deployment to clean production database
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function cleanupNoticeMatches() {
  console.log('🧹 Cleaning Up Matches to NOTICE Programs...\n');

  try {
    // ================================================================
    // Step 1: Find all matches to NOTICE programs
    // ================================================================
    const noticeMatches = await db.funding_matches.findMany({
      where: {
        funding_programs: {
          announcementType: 'NOTICE',
        },
      },
      include: {
        funding_programs: {
          select: {
            id: true,
            title: true,
            announcementType: true,
            scrapingSource: true,
          },
        },
        organizations: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`📊 Found ${noticeMatches.length} matches to NOTICE programs\n`);

    if (noticeMatches.length === 0) {
      console.log('✅ No NOTICE matches found. Database is clean!');
      return;
    }

    // ================================================================
    // Step 2: Show detailed breakdown by program
    // ================================================================
    console.log('📋 Matches to be Deleted (grouped by program):');
    console.log('─'.repeat(80));

    // Group by program
    const matchesByProgram = noticeMatches.reduce((acc, match) => {
      const programId = match.funding_programs.id;
      if (!acc[programId]) {
        acc[programId] = {
          program: match.funding_programs,
          matches: [],
        };
      }
      acc[programId].matches.push(match);
      return acc;
    }, {} as Record<string, any>);

    Object.values(matchesByProgram).forEach((group: any, index) => {
      console.log(`\n${index + 1}. NOTICE Program: "${group.program.title}"`);
      console.log(`   Source: ${group.program.scrapingSource?.toUpperCase() || 'UNKNOWN'}`);
      console.log(`   Matched to ${group.matches.length} organization(s):`);
      group.matches.forEach((match: any, i: number) => {
        console.log(`      ${i + 1}. ${match.organizations.name} (Score: ${match.score})`);
      });
    });

    console.log('\n' + '─'.repeat(80) + '\n');

    // ================================================================
    // Step 3: Delete all matches to NOTICE programs
    // ================================================================
    console.log('💾 Deleting NOTICE matches from database...\n');

    const result = await db.funding_matches.deleteMany({
      where: {
        funding_programs: {
          announcementType: 'NOTICE',
        },
      },
    });

    console.log(`✅ Deleted ${result.count} NOTICE matches\n`);

    // ================================================================
    // Step 4: Verification
    // ================================================================
    console.log('🔍 Verification: Checking remaining matches by announcement type...\n');

    const verification = await db.funding_matches.findMany({
      include: {
        funding_programs: {
          select: {
            announcementType: true,
          },
        },
      },
    });

    const byType = verification.reduce((acc, match) => {
      const type = match.funding_programs.announcementType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Remaining matches by announcement type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} matches`);
    });

    if (byType['NOTICE']) {
      console.warn(`\n⚠️  WARNING: ${byType['NOTICE']} NOTICE matches still remain!`);
    } else {
      console.log('\n✅ Verification passed: No NOTICE matches remain');
    }

    // ================================================================
    // Final Summary
    // ================================================================
    console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                         ✅ COMPLETE                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log('🎯 Expected Outcome:');
    console.log('   • Match results now show ONLY R_D_PROJECT programs');
    console.log('   • NOTICE programs (procurement bids, policy research) are excluded');
    console.log(`   • ${result.count} contaminated matches removed from database\n`);

    console.log('📋 Next Steps:');
    console.log('   1. Test Kim Byung-jin profile: Should show 5 matches (not 7)');
    console.log('   2. Verify at http://localhost:3000/dashboard/matches');
    console.log('   3. Confirm these programs are GONE:');
    console.log('      - "정책연구용역(AI 기본사회) 입찰공고"');
    console.log('      - "정책연구용역(해외센터 효율화) 입찰공고"\n');

  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

cleanupNoticeMatches().catch(console.error);
