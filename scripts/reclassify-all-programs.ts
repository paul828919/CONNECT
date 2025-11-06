/**
 * Retroactive Classification Script
 *
 * Purpose: Reclassify all 172 existing programs in database using the shared classification utility
 *
 * Problem:
 * - Migration backfilled ALL programs with announcementType: R_D_PROJECT (default)
 * - Only IITP parser had classification logic (TIPA/KIMST didn't)
 * - Result: 6 surveys and 6 notices incorrectly classified as R&D projects
 * - These show up in match results even though they shouldn't
 *
 * Solution:
 * - Read all programs from database
 * - Apply shared classification logic (title + description + url + source)
 * - Update announcementType field
 * - Generate detailed report
 *
 * Usage:
 * - Local: docker exec connect_dev_app npx tsx scripts/reclassify-all-programs.ts
 * - Verify changes before production deployment
 */

import { PrismaClient } from '@prisma/client';
import { classifyAnnouncement } from '../lib/scraping/classification';

const db = new PrismaClient();

interface ReclassificationResult {
  id: string;
  title: string;
  scrapingSource: string | null;
  previousType: string;
  newType: string;
  changed: boolean;
}

interface ReclassificationStats {
  total: number;
  unchanged: number;
  changed: number;
  byNewType: {
    R_D_PROJECT: number;
    SURVEY: number;
    EVENT: number;
    NOTICE: number;
    UNKNOWN: number;
  };
  examples: {
    SURVEY: ReclassificationResult[];
    EVENT: ReclassificationResult[];
    NOTICE: ReclassificationResult[];
    UNKNOWN: ReclassificationResult[];
  };
}

async function reclassifyAllPrograms() {
  console.log('🔄 Retroactive Classification Script');
  console.log('=====================================\n');

  try {
    // ================================================================
    // Step 1: Read all programs from database
    // ================================================================
    console.log('📚 Step 1: Reading all programs from database...\n');

    const allPrograms = await db.funding_programs.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        announcementUrl: true,
        scrapingSource: true,
        announcementType: true,
      },
      orderBy: {
        scrapingSource: 'asc',
      },
    });

    console.log(`✅ Found ${allPrograms.length} programs\n`);

    // ================================================================
    // Step 2: Classify each program using shared utility
    // ================================================================
    console.log('🤖 Step 2: Reclassifying programs...\n');

    const results: ReclassificationResult[] = [];
    let changeCount = 0;

    for (const program of allPrograms) {
      const newType = classifyAnnouncement({
        title: program.title,
        description: program.description || '',
        url: program.announcementUrl,
        source: program.scrapingSource as any,
      });

      const changed = program.announcementType !== newType;
      if (changed) {
        changeCount++;
      }

      results.push({
        id: program.id,
        title: program.title,
        scrapingSource: program.scrapingSource,
        previousType: program.announcementType,
        newType,
        changed,
      });
    }

    console.log(`✅ Classification complete: ${changeCount} programs will be updated\n`);

    // ================================================================
    // Step 3: Generate Statistics
    // ================================================================
    console.log('📊 Step 3: Generating statistics...\n');

    const stats: ReclassificationStats = {
      total: results.length,
      unchanged: results.filter(r => !r.changed).length,
      changed: results.filter(r => r.changed).length,
      byNewType: {
        R_D_PROJECT: results.filter(r => r.newType === 'R_D_PROJECT').length,
        SURVEY: results.filter(r => r.newType === 'SURVEY').length,
        EVENT: results.filter(r => r.newType === 'EVENT').length,
        NOTICE: results.filter(r => r.newType === 'NOTICE').length,
        UNKNOWN: results.filter(r => r.newType === 'UNKNOWN').length,
      },
      examples: {
        SURVEY: results.filter(r => r.newType === 'SURVEY' && r.changed).slice(0, 5),
        EVENT: results.filter(r => r.newType === 'EVENT' && r.changed).slice(0, 5),
        NOTICE: results.filter(r => r.newType === 'NOTICE' && r.changed).slice(0, 5),
        UNKNOWN: results.filter(r => r.newType === 'UNKNOWN' && r.changed).slice(0, 5),
      },
    };

    // ================================================================
    // Step 4: Display Report
    // ================================================================
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                    RECLASSIFICATION REPORT                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log(`📈 Total Programs: ${stats.total}`);
    console.log(`✅ Unchanged: ${stats.unchanged}`);
    console.log(`🔄 Changed: ${stats.changed}\n`);

    console.log('📊 Classification Breakdown:');
    console.log(`   R_D_PROJECT (Research Funding): ${stats.byNewType.R_D_PROJECT}`);
    console.log(`   SURVEY (Demand Surveys):        ${stats.byNewType.SURVEY}`);
    console.log(`   EVENT (Briefings/Seminars):     ${stats.byNewType.EVENT}`);
    console.log(`   NOTICE (General Notices):       ${stats.byNewType.NOTICE}`);
    console.log(`   UNKNOWN (Unclassified):         ${stats.byNewType.UNKNOWN}\n`);

    // Show examples of reclassified programs
    if (stats.examples.SURVEY.length > 0) {
      console.log('🔍 Example SURVEYS (hidden from matches):');
      stats.examples.SURVEY.forEach((r, i) => {
        console.log(`   ${i + 1}. [${r.scrapingSource?.toUpperCase()}] ${r.title.substring(0, 60)}...`);
        console.log(`      Previous: ${r.previousType} → New: ${r.newType}`);
      });
      console.log('');
    }

    if (stats.examples.NOTICE.length > 0) {
      console.log('🔍 Example NOTICES (hidden from matches):');
      stats.examples.NOTICE.forEach((r, i) => {
        console.log(`   ${i + 1}. [${r.scrapingSource?.toUpperCase()}] ${r.title.substring(0, 60)}...`);
        console.log(`      Previous: ${r.previousType} → New: ${r.newType}`);
      });
      console.log('');
    }

    if (stats.examples.EVENT.length > 0) {
      console.log('🔍 Example EVENTS (hidden from matches):');
      stats.examples.EVENT.forEach((r, i) => {
        console.log(`   ${i + 1}. [${r.scrapingSource?.toUpperCase()}] ${r.title.substring(0, 60)}...`);
        console.log(`      Previous: ${r.previousType} → New: ${r.newType}`);
      });
      console.log('');
    }

    // ================================================================
    // Step 5: Update Database (only changed programs)
    // ================================================================
    if (stats.changed > 0) {
      console.log(`💾 Step 4: Updating ${stats.changed} programs in database...\n`);

      const changedPrograms = results.filter(r => r.changed);

      // Use transaction for atomicity
      await db.$transaction(
        changedPrograms.map(program =>
          db.funding_programs.update({
            where: { id: program.id },
            data: { announcementType: program.newType as any },
          })
        )
      );

      console.log('✅ Database update complete!\n');
    } else {
      console.log('ℹ️  No changes needed - all programs already correctly classified\n');
    }

    // ================================================================
    // Step 6: Verification
    // ================================================================
    console.log('🔍 Step 5: Verification...\n');

    const verification = await db.funding_programs.groupBy({
      by: ['announcementType'],
      _count: true,
    });

    console.log('Database verification:');
    verification.forEach(v => {
      console.log(`   ${v.announcementType}: ${v._count} programs`);
    });
    console.log('');

    // ================================================================
    // Final Summary
    // ================================================================
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                         ✅ COMPLETE                                ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log('🎯 Expected Outcome:');
    console.log(`   • Match results will now show ONLY ${stats.byNewType.R_D_PROJECT} R&D funding opportunities`);
    console.log(`   • ${stats.byNewType.SURVEY} surveys will be hidden from matches`);
    console.log(`   • ${stats.byNewType.NOTICE} notices will be hidden from matches`);
    console.log(`   • ${stats.byNewType.EVENT} events will be hidden from matches\n`);

    console.log('📋 Next Steps:');
    console.log('   1. Verify at http://localhost:3000/dashboard/matches');
    console.log('   2. Check that surveys/notices no longer appear');
    console.log('   3. Verify specific programs:');
    console.log('      - "정보통신·방송 연구개발사업 기술수요조사" → Should be SURVEY');
    console.log('      - "한국무역보험공사 연계 수출지원프로그램 시행계획 안내" → Should be NOTICE\n');

  } catch (error) {
    console.error('❌ Error during reclassification:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
reclassifyAllPrograms()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
