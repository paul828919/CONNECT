/**
 * Unmapped Agency Detection Alert Script
 *
 * Queries and reports unmapped agencies detected during recent scraping sessions.
 * Helps maintain 0% omission rate by identifying agencies that need manual mapping.
 *
 * Usage:
 *   npx tsx scripts/check-unmapped-detections.ts [days] [--csv]
 *
 * Examples:
 *   npx tsx scripts/check-unmapped-detections.ts              # Last 7 days
 *   npx tsx scripts/check-unmapped-detections.ts 30           # Last 30 days
 *   npx tsx scripts/check-unmapped-detections.ts 7 --csv      # Export CSV
 */

import {
  getUnmappedAgencySummary,
  getUnresolvedCount,
  type UnmappedAgencySummary,
} from '@/lib/scraping/monitoring';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_DAYS = 7;

// Parse command line arguments
const args = process.argv.slice(2);
const days = args[0] && !args[0].startsWith('--') ? parseInt(args[0], 10) : DEFAULT_DAYS;
const exportCsv = args.includes('--csv');

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔔  UNMAPPED AGENCY DETECTION REPORT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get unresolved count
  const unresolvedCount = await getUnresolvedCount();
  console.log(`📊  Total Unresolved Detections: ${unresolvedCount}`);
  console.log(`📅  Reporting Period: Last ${days} days\n`);

  if (unresolvedCount === 0) {
    console.log('✅  No unmapped agencies detected!');
    console.log('    The categorization system is maintaining 0% omission rate.\n');
    process.exit(0);
  }

  // Get detailed summary
  const summary = await getUnmappedAgencySummary(days, true);

  if (summary.length === 0) {
    console.log('✅  No new unmapped agencies in the last ${days} days.');
    console.log(`    (${unresolvedCount} older detections still unresolved)\n`);
    process.exit(0);
  }

  // Display summary
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('⚠️  DETECTED UNMAPPED AGENCIES\n');

  for (let i = 0; i < summary.length; i++) {
    const item = summary[i];
    console.log(`${i + 1}. Ministry: ${item.ministry || '(NULL)'}`);
    console.log(`   Agency: ${item.agency || '(NULL)'}`);
    console.log(`   Programs: ${item.programCount}`);
    console.log(`   First Detected: ${item.firstDetected.toISOString().split('T')[0]}`);
    console.log(`   Last Detected: ${item.lastDetected.toISOString().split('T')[0]}`);
    console.log(`   Sample Programs:`);

    for (const program of item.samplePrograms) {
      console.log(`     - ${program.title}`);
    }
    console.log('');
  }

  // Recommendations
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log('📋  RECOMMENDED ACTIONS\n');
  console.log('1. Review unmapped agencies above');
  console.log('2. Add mappings to lib/scraping/parsers/agency-mapper.ts:');
  console.log('   - Update MINISTRY_TO_CATEGORY for ministry-level mappings');
  console.log('   - Update AGENCY_TO_CATEGORY for agency-specific mappings\n');
  console.log('3. Run reclassification script:');
  console.log('   npx tsx scripts/reclassify-unmapped-programs.ts\n');
  console.log('4. Mark detections as resolved:');
  console.log('   (Use monitoring service\'s markAsResolved() function)\n');

  // CSV Export
  if (exportCsv) {
    console.log('─────────────────────────────────────────────────────────────\n');
    console.log('💾  Exporting to CSV...\n');
    exportToCsv(summary);
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(unresolvedCount > 0 ? 1 : 0);
}

// ============================================================================
// CSV Export
// ============================================================================

function exportToCsv(summary: UnmappedAgencySummary[]) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `unmapped-agencies-${timestamp}.csv`;
  const filepath = join(process.cwd(), filename);

  // Build CSV content
  const header = 'Ministry,Agency,Program Count,First Detected,Last Detected,Sample Program IDs,Sample Titles\n';
  const rows = summary.map((item) => {
    const ministry = (item.ministry || 'NULL').replace(/,/g, ';');
    const agency = (item.agency || 'NULL').replace(/,/g, ';');
    const programCount = item.programCount;
    const firstDetected = item.firstDetected.toISOString().split('T')[0];
    const lastDetected = item.lastDetected.toISOString().split('T')[0];
    const sampleIds = item.samplePrograms.map(p => p.id).join(' | ');
    const sampleTitles = item.samplePrograms.map(p => p.title.replace(/,/g, ';')).join(' | ');

    return `"${ministry}","${agency}",${programCount},${firstDetected},${lastDetected},"${sampleIds}","${sampleTitles}"`;
  });

  const csvContent = header + rows.join('\n');

  // Write to file
  writeFileSync(filepath, csvContent, 'utf-8');
  console.log(`✅  CSV exported to: ${filename}`);
  console.log(`    Contains ${summary.length} unmapped agency records\n`);
}

// ============================================================================
// Error Handling
// ============================================================================

main().catch((error) => {
  console.error('\n❌  Script failed with error:\n');
  console.error(error);
  process.exit(1);
});
