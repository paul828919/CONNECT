/**
 * Reclassify Existing Programs - TRL Enhancement
 *
 * Updates existing funding programs with enhanced TRL detection:
 * - Re-extracts TRL using new implicit detection logic
 * - Generates TRL classification for each program
 * - Updates trlConfidence and trlClassification fields
 *
 * This script demonstrates the improvement from the enhanced TRL extraction
 * that includes implicit detection from Korean research stage keywords.
 *
 * Usage:
 *   npx tsx scripts/reclassify-existing-programs-trl.ts [--dry-run] [--verbose]
 *
 * Examples:
 *   npx tsx scripts/reclassify-existing-programs-trl.ts              # Update all programs
 *   npx tsx scripts/reclassify-existing-programs-trl.ts --dry-run    # Preview changes only
 *   npx tsx scripts/reclassify-existing-programs-trl.ts --verbose    # Show detailed output
 */

import { db } from '@/lib/db';
import { extractTRLRange } from '@/lib/scraping/utils';
import { classifyTRL, type TRLClassification } from '@/lib/matching/trl-classifier';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose');

interface ReclassificationResult {
  programId: string;
  title: string;
  oldMinTRL: number | null;
  oldMaxTRL: number | null;
  oldConfidence: string | null;
  newMinTRL: number | null;
  newMaxTRL: number | null;
  newConfidence: 'explicit' | 'inferred' | 'missing';
  newClassification: TRLClassification | null;
  changed: boolean;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄  TRL RECLASSIFICATION SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('⚠️   DRY RUN MODE - No database changes will be made\n');
  }

  // Fetch all active programs
  const programs = await db.funding_programs.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      description: true,
      minTrl: true,
      maxTrl: true,
      // @ts-ignore - trlConfidence added via migration but not yet in Prisma types
      trlConfidence: true,
      announcementUrl: true,
    },
  });

  console.log(`📊  Total Active Programs: ${programs.length}\n`);

  if (programs.length === 0) {
    console.log('⚠️   No active programs found in database.\n');
    process.exit(0);
  }

  console.log('🔍  Analyzing programs for TRL reclassification...\n');
  console.log('─────────────────────────────────────────────────────────────\n');

  // Track statistics
  const stats = {
    total: programs.length,
    unchanged: 0,
    improved: 0,
    newlyDetected: 0,
    lostDetection: 0,
    confidenceUpgraded: 0,
    confidenceDowngraded: 0,
  };

  const results: ReclassificationResult[] = [];

  // Reclassify each program
  for (const program of programs) {
    const result = await reclassifyProgram(program);
    results.push(result);

    // Update statistics
    if (!result.changed) {
      stats.unchanged++;
    } else {
      stats.improved++;

      // Detailed change tracking
      const hadTRL = result.oldMinTRL !== null || result.oldMaxTRL !== null;
      const hasTRL = result.newMinTRL !== null || result.newMaxTRL !== null;

      if (!hadTRL && hasTRL) {
        stats.newlyDetected++;
      } else if (hadTRL && !hasTRL) {
        stats.lostDetection++;
      }

      // Confidence change tracking
      if (result.oldConfidence !== result.newConfidence) {
        const confidenceLevels = { explicit: 3, inferred: 2, missing: 1 };
        const oldLevel = confidenceLevels[result.oldConfidence as keyof typeof confidenceLevels] || 1;
        const newLevel = confidenceLevels[result.newConfidence];

        if (newLevel > oldLevel) {
          stats.confidenceUpgraded++;
        } else if (newLevel < oldLevel) {
          stats.confidenceDowngraded++;
        }
      }
    }

    // Show progress
    if (verbose && result.changed) {
      console.log(`✓ Updated: ${result.title.substring(0, 60)}...`);
      console.log(`  Old: TRL ${result.oldMinTRL ?? 'N/A'}-${result.oldMaxTRL ?? 'N/A'} (${result.oldConfidence ?? 'N/A'})`);
      console.log(`  New: TRL ${result.newMinTRL ?? 'N/A'}-${result.newMaxTRL ?? 'N/A'} (${result.newConfidence})\n`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────\n');
  console.log('📈  RECLASSIFICATION RESULTS\n');
  console.log(`Total Programs: ${stats.total}`);
  console.log(`✓ Unchanged: ${stats.unchanged} (${((stats.unchanged / stats.total) * 100).toFixed(1)}%)`);
  console.log(`✓ Improved: ${stats.improved} (${((stats.improved / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  - Newly Detected TRL: ${stats.newlyDetected}`);
  console.log(`  - Confidence Upgraded: ${stats.confidenceUpgraded}`);
  console.log(`  - Lost Detection: ${stats.lostDetection}`);
  console.log(`  - Confidence Downgraded: ${stats.confidenceDowngraded}\n`);

  // Update database if not dry run
  if (!isDryRun) {
    console.log('─────────────────────────────────────────────────────────────\n');
    console.log('💾  Updating database...\n');

    let updateCount = 0;
    for (const result of results) {
      if (result.changed) {
        await db.funding_programs.update({
          where: { id: result.programId },
          data: {
            minTrl: result.newMinTRL,
            maxTrl: result.newMaxTRL,
            // @ts-ignore - trlConfidence added via migration but not yet in Prisma types
            trlConfidence: result.newConfidence,
            // @ts-ignore - trlClassification added via migration but not yet in Prisma types
            trlClassification: result.newClassification || undefined,
          },
        });
        updateCount++;
      }
    }

    console.log(`✅  Updated ${updateCount} programs in database.\n`);
  } else {
    console.log('─────────────────────────────────────────────────────────────\n');
    console.log('⚠️   DRY RUN: No database changes were made.\n');
    console.log('To apply changes, run without --dry-run flag.\n');
  }

  // Show sample improvements
  if (verbose) {
    showSampleImprovements(results);
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

// ============================================================================
// Reclassification Logic
// ============================================================================

async function reclassifyProgram(program: any): Promise<ReclassificationResult> {
  const oldMinTRL = program.minTrl;
  const oldMaxTRL = program.maxTrl;
  const oldConfidence = program.trlConfidence;

  // Extract TRL from program text (title + description)
  const combinedText = `${program.title || ''} ${program.description || ''}`;
  const trlRange = extractTRLRange(combinedText);

  let newMinTRL: number | null = null;
  let newMaxTRL: number | null = null;
  let newConfidence: 'explicit' | 'inferred' | 'missing' = 'missing';
  let newClassification: TRLClassification | null = null;

  if (trlRange) {
    newMinTRL = trlRange.minTRL;
    newMaxTRL = trlRange.maxTRL;
    newConfidence = trlRange.confidence;

    // Generate classification
    try {
      newClassification = classifyTRL(trlRange.minTRL, trlRange.maxTRL);
    } catch (error) {
      console.warn(
        `[RECLASSIFY] Failed to classify TRL ${trlRange.minTRL}-${trlRange.maxTRL} for program ${program.id}:`,
        error
      );
    }
  }

  // Determine if changed
  const changed =
    oldMinTRL !== newMinTRL ||
    oldMaxTRL !== newMaxTRL ||
    oldConfidence !== newConfidence;

  return {
    programId: program.id,
    title: program.title || 'Untitled',
    oldMinTRL,
    oldMaxTRL,
    oldConfidence,
    newMinTRL,
    newMaxTRL,
    newConfidence,
    newClassification,
    changed,
  };
}

// ============================================================================
// Display Functions
// ============================================================================

function showSampleImprovements(results: ReclassificationResult[]) {
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('📋  SAMPLE IMPROVEMENTS (Top 5)\n');

  const improvements = results
    .filter((r) => r.changed && r.newMinTRL !== null)
    .slice(0, 5);

  if (improvements.length === 0) {
    console.log('No improvements to show.\n');
    return;
  }

  for (const result of improvements) {
    console.log(`✓ ${result.title.substring(0, 70)}...`);
    console.log(`  Before: TRL ${result.oldMinTRL ?? 'N/A'}-${result.oldMaxTRL ?? 'N/A'} (${result.oldConfidence ?? 'N/A'})`);
    console.log(`  After:  TRL ${result.newMinTRL}-${result.newMaxTRL} (${result.newConfidence})`);
    if (result.newClassification) {
      console.log(`  Stage:  ${result.newClassification.stageKorean}`);
    }
    console.log('');
  }
}

// ============================================================================
// Error Handling
// ============================================================================

main().catch((error) => {
  console.error('\n❌  Script failed with error:\n');
  console.error(error);
  process.exit(1);
});
