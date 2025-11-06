/**
 * TRL Coverage Verification Script
 *
 * Analyzes TRL detection coverage across all funding programs:
 * - Explicit TRL detection (direct mentions like "TRL 4-6")
 * - Inferred TRL detection (from Korean keywords like "기초연구", "실용화")
 * - Missing TRL (no detection)
 *
 * Usage:
 *   npx tsx scripts/verify-trl-coverage.ts [--csv] [--verbose]
 *
 * Examples:
 *   npx tsx scripts/verify-trl-coverage.ts              # Summary report
 *   npx tsx scripts/verify-trl-coverage.ts --csv        # Export to CSV
 *   npx tsx scripts/verify-trl-coverage.ts --verbose    # Show sample programs
 */

import { db } from '@/lib/db';
import { getTRLStageName } from '@/lib/matching/trl';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const exportCsv = args.includes('--csv');
const verbose = args.includes('--verbose');

interface TRLCoverageStats {
  total: number;
  explicit: number;
  inferred: number;
  missing: number;
  explicitPercent: number;
  inferredPercent: number;
  missingPercent: number;
}

interface TRLStageDistribution {
  stage: string;
  count: number;
  percent: number;
}

interface ProgramSample {
  id: string;
  title: string;
  minTRL: number | null;
  maxTRL: number | null;
  confidence: string;
  stage?: string;
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍  TRL COVERAGE ANALYSIS REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Fetch all active programs
  const programs = await db.funding_programs.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      minTrl: true,
      maxTrl: true,
      // @ts-ignore - trlConfidence added via migration but not yet in Prisma types
      trlConfidence: true,
    },
  });

  console.log(`📊  Total Active Programs: ${programs.length}\n`);

  if (programs.length === 0) {
    console.log('⚠️   No active programs found in database.\n');
    process.exit(0);
  }

  // Calculate coverage statistics
  const stats = calculateCoverageStats(programs);
  displayCoverageStats(stats);

  // Calculate stage distribution (only for programs with TRL)
  const stageDistribution = calculateStageDistribution(programs);
  displayStageDistribution(stageDistribution);

  // Show sample programs if verbose mode
  if (verbose) {
    displaySamplePrograms(programs);
  }

  // Export to CSV if requested
  if (exportCsv) {
    exportToCsv(programs, stats, stageDistribution);
  }

  // Assessment
  displayAssessment(stats);

  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(0);
}

// ============================================================================
// Analysis Functions
// ============================================================================

function calculateCoverageStats(programs: any[]): TRLCoverageStats {
  const total = programs.length;
  const explicit = programs.filter((p) => p.trlConfidence === 'explicit').length;
  const inferred = programs.filter((p) => p.trlConfidence === 'inferred').length;
  const missing = programs.filter(
    (p) => !p.trlConfidence || p.trlConfidence === 'missing'
  ).length;

  return {
    total,
    explicit,
    inferred,
    missing,
    explicitPercent: (explicit / total) * 100,
    inferredPercent: (inferred / total) * 100,
    missingPercent: (missing / total) * 100,
  };
}

function calculateStageDistribution(programs: any[]): TRLStageDistribution[] {
  const programsWithTRL = programs.filter((p) => p.minTrl && p.maxTrl);

  const stageCount: Record<string, number> = {
    '기초연구 (TRL 1-3)': 0,
    '응용연구 (TRL 4-6)': 0,
    '실용화/사업화 (TRL 7-9)': 0,
  };

  for (const program of programsWithTRL) {
    const midpoint = Math.floor((program.minTrl + program.maxTrl) / 2);
    const stageName = getTRLStageName(midpoint);

    if (midpoint <= 3) {
      stageCount['기초연구 (TRL 1-3)']++;
    } else if (midpoint <= 6) {
      stageCount['응용연구 (TRL 4-6)']++;
    } else {
      stageCount['실용화/사업화 (TRL 7-9)']++;
    }
  }

  const total = programsWithTRL.length;

  return Object.entries(stageCount).map(([stage, count]) => ({
    stage,
    count,
    percent: total > 0 ? (count / total) * 100 : 0,
  }));
}

// ============================================================================
// Display Functions
// ============================================================================

function displayCoverageStats(stats: TRLCoverageStats) {
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('📈  TRL DETECTION COVERAGE\n');
  console.log(`Total Programs: ${stats.total}`);
  console.log(
    `✓ Explicit Detection: ${stats.explicit} (${stats.explicitPercent.toFixed(1)}%)`
  );
  console.log(
    `✓ Inferred Detection: ${stats.inferred} (${stats.inferredPercent.toFixed(1)}%)`
  );
  console.log(
    `✗ Missing TRL: ${stats.missing} (${stats.missingPercent.toFixed(1)}%)`
  );
  console.log(
    `\n📊  Total Coverage: ${((stats.explicit + stats.inferred) / stats.total * 100).toFixed(1)}%`
  );
  console.log('');
}

function displayStageDistribution(distribution: TRLStageDistribution[]) {
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('🎯  TRL STAGE DISTRIBUTION\n');

  for (const stage of distribution) {
    const bar = '█'.repeat(Math.floor(stage.percent / 2));
    console.log(`${stage.stage}: ${stage.count} (${stage.percent.toFixed(1)}%)`);
    console.log(`  ${bar}\n`);
  }
}

function displaySamplePrograms(programs: any[]) {
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('📋  SAMPLE PROGRAMS BY DETECTION METHOD\n');

  // Explicit detection samples
  const explicitSamples = programs
    .filter((p) => p.trlConfidence === 'explicit')
    .slice(0, 3);

  console.log('✓ Explicit Detection (3 samples):');
  for (const program of explicitSamples) {
    console.log(`  - ${program.title.substring(0, 70)}...`);
    console.log(`    TRL ${program.minTrl}-${program.maxTrl}\n`);
  }

  // Inferred detection samples
  const inferredSamples = programs
    .filter((p) => p.trlConfidence === 'inferred')
    .slice(0, 3);

  console.log('\n✓ Inferred Detection (3 samples):');
  for (const program of inferredSamples) {
    console.log(`  - ${program.title.substring(0, 70)}...`);
    console.log(`    TRL ${program.minTrl}-${program.maxTrl}\n`);
  }

  // Missing TRL samples
  const missingSamples = programs
    .filter((p) => !p.trlConfidence || p.trlConfidence === 'missing')
    .slice(0, 3);

  console.log('\n✗ Missing TRL (3 samples):');
  for (const program of missingSamples) {
    console.log(`  - ${program.title.substring(0, 70)}...`);
    console.log(`    No TRL detected\n`);
  }
}

function displayAssessment(stats: TRLCoverageStats) {
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('📋  ASSESSMENT\n');

  const totalCoverage = (stats.explicit + stats.inferred) / stats.total * 100;

  if (totalCoverage >= 90) {
    console.log('✅  EXCELLENT: TRL coverage exceeds 90% target!');
    console.log('    The implicit detection strategy is working effectively.\n');
  } else if (totalCoverage >= 75) {
    console.log('✓  GOOD: TRL coverage above 75%.');
    console.log('    Continue monitoring and refining detection patterns.\n');
  } else if (totalCoverage >= 60) {
    console.log('⚠️   MODERATE: TRL coverage at 60-75%.');
    console.log('    Consider expanding Korean keyword patterns.\n');
  } else {
    console.log('❌  LOW: TRL coverage below 60%.');
    console.log('    Review and expand TRL detection strategies.\n');
  }

  // Recommendations
  console.log('📋  RECOMMENDATIONS:\n');

  if (stats.missing > stats.total * 0.1) {
    console.log('1. Review programs with missing TRL:');
    console.log('   - Analyze announcement text for new keyword patterns');
    console.log('   - Expand implicit detection rules in lib/scraping/utils.ts\n');
  }

  console.log('2. Monitor TRL confidence distribution:');
  console.log('   - Explicit detection should be 40-60%');
  console.log('   - Inferred detection should be 30-50%');
  console.log('   - Missing should be <10%\n');

  console.log('3. Validate inferred TRL accuracy:');
  console.log('   - Manually verify 10-20 inferred programs');
  console.log('   - Ensure Korean keywords map to correct TRL ranges\n');
}

// ============================================================================
// CSV Export
// ============================================================================

function exportToCsv(
  programs: any[],
  stats: TRLCoverageStats,
  distribution: TRLStageDistribution[]
) {
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('💾  Exporting to CSV...\n');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `trl-coverage-${timestamp}.csv`;
  const filepath = join(process.cwd(), filename);

  // Build CSV content
  const header =
    'Program ID,Title,Min TRL,Max TRL,Confidence,Stage\n';
  const rows = programs.map((program) => {
    const title = (program.title || '').replace(/,/g, ';').replace(/"/g, '""');
    const minTrl = program.minTrl || 'N/A';
    const maxTrl = program.maxTrl || 'N/A';
    const confidence = program.trlConfidence || 'missing';
    const stage =
      program.minTrl && program.maxTrl
        ? getTRLStageName(Math.floor((program.minTrl + program.maxTrl) / 2))
        : 'N/A';

    return `"${program.id}","${title}",${minTrl},${maxTrl},${confidence},"${stage}"`;
  });

  const csvContent = header + rows.join('\n');

  // Write to file
  writeFileSync(filepath, csvContent, 'utf-8');
  console.log(`✅  CSV exported to: ${filename}`);
  console.log(`    Contains ${programs.length} program records\n`);
}

// ============================================================================
// Error Handling
// ============================================================================

main().catch((error) => {
  console.error('\n❌  Script failed with error:\n');
  console.error(error);
  process.exit(1);
});
