/**
 * Manual Override Script - Single Program Reclassification with Cache Invalidation
 *
 * Purpose: Immediately reclassify a misclassified program based on user feedback
 *
 * Use Case:
 * - User reports: "This match is not real funding, it's a survey"
 * - Admin runs: npx tsx scripts/reclassify-single-program.ts <programId> SURVEY
 * - Result: Program reclassified + all match caches invalidated
 * - User sees correction in < 1 minute (not 24 hours)
 *
 * Workflow:
 * 1. Fetch program from database
 * 2. Validate new classification type
 * 3. Update database record
 * 4. Invalidate all match caches (CRITICAL for immediate user feedback)
 * 5. Log audit trail
 * 6. Display verification summary
 *
 * Usage:
 * - Local: npx tsx scripts/reclassify-single-program.ts <programId> <newType>
 * - Production: ssh server → docker exec connect_app npx tsx scripts/reclassify-single-program.ts <programId> <newType>
 *
 * Example:
 * ```bash
 * # Reclassify program as SURVEY (user feedback: "this is not funding")
 * npx tsx scripts/reclassify-single-program.ts cm3abc123 SURVEY
 *
 * # Reclassify program back to R_D_PROJECT (false positive)
 * npx tsx scripts/reclassify-single-program.ts cm3abc123 R_D_PROJECT
 * ```
 *
 * Arguments:
 * - programId: The ID of the funding_programs record to reclassify
 * - newType: One of R_D_PROJECT, SURVEY, EVENT, NOTICE, UNKNOWN
 *
 * Exit Codes:
 * - 0: Success
 * - 1: Invalid arguments or program not found
 */

import { PrismaClient, AnnouncementType } from '@prisma/client';
import { invalidateAllMatches } from '../lib/cache/redis-cache';

const db = new PrismaClient();

// Valid announcement types
const VALID_TYPES: AnnouncementType[] = ['R_D_PROJECT', 'SURVEY', 'EVENT', 'NOTICE', 'UNKNOWN'];

interface ReclassificationAudit {
  timestamp: string;
  programId: string;
  programTitle: string;
  previousType: AnnouncementType;
  newType: AnnouncementType;
  cacheInvalidated: boolean;
  affectedCacheCount: number;
}

/**
 * Display usage instructions
 */
function showUsage() {
  console.log('\n📚 Usage:');
  console.log('  npx tsx scripts/reclassify-single-program.ts <programId> <newType>\n');
  console.log('Valid types: R_D_PROJECT, SURVEY, EVENT, NOTICE, UNKNOWN\n');
  console.log('Example:');
  console.log('  npx tsx scripts/reclassify-single-program.ts cm3abc123 SURVEY\n');
}

/**
 * Validate command line arguments
 */
function validateArguments(args: string[]): { programId: string; newType: AnnouncementType } | null {
  if (args.length !== 2) {
    console.error('❌ Error: Expected 2 arguments (programId, newType)');
    showUsage();
    return null;
  }

  const [programId, newTypeStr] = args;

  if (!VALID_TYPES.includes(newTypeStr as AnnouncementType)) {
    console.error(`❌ Error: Invalid type "${newTypeStr}"`);
    console.error(`   Valid types: ${VALID_TYPES.join(', ')}`);
    showUsage();
    return null;
  }

  return {
    programId,
    newType: newTypeStr as AnnouncementType,
  };
}

/**
 * Main reclassification function
 */
async function reclassifySingleProgram(programId: string, newType: AnnouncementType) {
  console.log('🔄 Manual Override - Single Program Reclassification');
  console.log('====================================================\n');

  try {
    // ================================================================
    // Step 1: Fetch program from database
    // ================================================================
    console.log(`📚 Step 1: Fetching program "${programId}"...\n`);

    const program = await db.funding_programs.findUnique({
      where: { id: programId },
      select: {
        id: true,
        title: true,
        announcementType: true,
        announcementUrl: true,
        scrapingSource: true,
        publishedAt: true,
      },
    });

    if (!program) {
      console.error(`❌ Error: Program with ID "${programId}" not found\n`);
      console.log('💡 Tip: Use the following query to find program IDs:');
      console.log('   docker exec connect_dev_postgres psql -U connect -d connect -c "SELECT id, title FROM funding_programs LIMIT 10;"\n');
      process.exit(1);
    }

    console.log(`✅ Found program: "${program.title.substring(0, 80)}..."\n`);
    console.log(`   Current type: ${program.announcementType}`);
    console.log(`   New type:     ${newType}\n`);

    // ================================================================
    // Step 2: Check if change is needed
    // ================================================================
    if (program.announcementType === newType) {
      console.log(`ℹ️  No change needed - program already classified as ${newType}\n`);
      process.exit(0);
    }

    // ================================================================
    // Step 3: Update database record
    // ================================================================
    console.log(`💾 Step 2: Updating database record...\n`);

    const updatedProgram = await db.funding_programs.update({
      where: { id: programId },
      data: { announcementType: newType },
    });

    console.log(`✅ Database update complete\n`);

    // ================================================================
    // Step 4: Invalidate all match caches (CRITICAL for immediate user feedback)
    // ================================================================
    console.log(`🗑️  Step 3: Invalidating all match caches...\n`);

    const cacheCount = await invalidateAllMatches();

    console.log(`✅ Invalidated ${cacheCount} match caches\n`);
    console.log(`   Users will see corrected matches in < 1 minute (not 24 hours)\n`);

    // ================================================================
    // Step 5: Generate audit log
    // ================================================================
    const audit: ReclassificationAudit = {
      timestamp: new Date().toISOString(),
      programId: program.id,
      programTitle: program.title,
      previousType: program.announcementType,
      newType,
      cacheInvalidated: true,
      affectedCacheCount: cacheCount,
    };

    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                      AUDIT LOG                                    ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log(`📅 Timestamp:         ${audit.timestamp}`);
    console.log(`🆔 Program ID:        ${audit.programId}`);
    console.log(`📄 Title:             ${audit.programTitle.substring(0, 60)}...`);
    console.log(`🔄 Classification:    ${audit.previousType} → ${audit.newType}`);
    console.log(`🗑️  Cache Invalidation: ${audit.cacheInvalidated ? '✅ Yes' : '❌ No'}`);
    console.log(`📊 Caches Cleared:    ${audit.affectedCacheCount}\n`);

    // ================================================================
    // Step 6: Display expected behavior
    // ================================================================
    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                      ✅ COMPLETE                                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

    console.log('🎯 Expected Outcome:\n');

    if (newType === 'R_D_PROJECT') {
      console.log(`   • This program will now APPEAR in match results`);
      console.log(`   • Users will see it as a funding opportunity\n`);
    } else {
      console.log(`   • This program will now be HIDDEN from match results`);
      console.log(`   • Users will NOT see it in their matches\n`);
    }

    console.log('📋 Verification Steps:\n');
    console.log('   1. Log into Connect dashboard at http://localhost:3000/dashboard');
    console.log('   2. Navigate to Matches page');
    console.log('   3. Generate new matches (if needed)');
    console.log(`   4. Verify "${program.title.substring(0, 40)}..." ${newType === 'R_D_PROJECT' ? 'APPEARS' : 'DOES NOT APPEAR'}\n`);

    console.log('💡 Tip: Changes take effect IMMEDIATELY due to cache invalidation\n');

  } catch (error) {
    console.error('❌ Error during reclassification:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// ================================================================
// Main Execution
// ================================================================

// Parse command line arguments (skip first 2: node and script path)
const args = process.argv.slice(2);

const validated = validateArguments(args);

if (!validated) {
  process.exit(1);
}

// Run the script
reclassifySingleProgram(validated.programId, validated.newType)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
