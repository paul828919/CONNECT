/**
 * Test TRL Enhancement - Verify improved extraction rate
 *
 * This script:
 * 1. Queries all funding_programs from database
 * 2. Re-extracts TRL using the new enhanced patterns
 * 3. Compares before/after extraction rates
 * 4. Shows detailed statistics on improvement
 */

import { PrismaClient } from '@prisma/client';
import { extractTRLRange } from '../lib/scraping/utils';

const prisma = new PrismaClient();

interface TRLComparisonResult {
  programId: string;
  title: string;
  description: string | null;

  // Current database values
  currentMinTRL: number | null;
  currentMaxTRL: number | null;
  currentTRLConfidence: string | null;

  // New extraction results
  newMinTRL: number | null;
  newMaxTRL: number | null;
  newConfidence: 'explicit' | 'inferred' | null;

  // Status
  wasExtracted: boolean; // Did database have TRL?
  newExtracted: boolean; // Did new pattern extract TRL?
  changed: boolean; // Did values change?
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         TRL Enhancement Test                               ║');
  console.log('║         Testing improved extraction patterns               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Step 1: Query all funding programs (R_D_PROJECT only)
  console.log('📊 Step 1: Querying funding programs...\n');

  const programs = await prisma.funding_programs.findMany({
    where: {
      announcementType: 'R_D_PROJECT', // Only test R&D projects
    },
    select: {
      id: true,
      title: true,
      description: true,
      minTrl: true,
      maxTrl: true,
      trlConfidence: true,
    },
  });

  console.log(`✓ Found ${programs.length} R&D programs\n`);

  if (programs.length === 0) {
    console.log('⚠️  No R&D programs found in database. Please seed data first.\n');
    await prisma.$disconnect();
    return;
  }

  // Step 2: Re-extract TRL for each program
  console.log('🔄 Step 2: Re-extracting TRL with new patterns...\n');

  const results: TRLComparisonResult[] = [];

  for (const program of programs) {
    // Combine text (same as processor does)
    const combinedText = `${program.title || ''} ${program.description || ''}`;

    // Extract TRL using new enhanced patterns
    const trlRange = extractTRLRange(combinedText);

    const result: TRLComparisonResult = {
      programId: program.id,
      title: program.title,
      description: program.description,

      currentMinTRL: program.minTrl,
      currentMaxTRL: program.maxTrl,
      currentTRLConfidence: program.trlConfidence,

      newMinTRL: trlRange?.minTRL ?? null,
      newMaxTRL: trlRange?.maxTRL ?? null,
      newConfidence: trlRange?.confidence ?? null,

      wasExtracted: program.minTrl !== null && program.maxTrl !== null,
      newExtracted: trlRange !== null,
      changed:
        program.minTrl !== (trlRange?.minTRL ?? null) ||
        program.maxTrl !== (trlRange?.maxTRL ?? null),
    };

    results.push(result);
  }

  console.log('✓ Completed TRL extraction\n');

  // Step 3: Calculate statistics
  console.log('📈 Step 3: Analyzing results...\n');
  console.log('═'.repeat(80));

  const stats = {
    total: results.length,

    // Old extraction (database)
    oldExtracted: results.filter(r => r.wasExtracted).length,
    oldNotExtracted: results.filter(r => !r.wasExtracted).length,

    // New extraction (enhanced patterns)
    newExtracted: results.filter(r => r.newExtracted).length,
    newNotExtracted: results.filter(r => !r.newExtracted).length,

    // Changes
    newlyExtracted: results.filter(r => !r.wasExtracted && r.newExtracted).length,
    valuesChanged: results.filter(r => r.wasExtracted && r.newExtracted && r.changed).length,
    lostExtraction: results.filter(r => r.wasExtracted && !r.newExtracted).length,

    // Confidence breakdown
    explicit: results.filter(r => r.newConfidence === 'explicit').length,
    inferred: results.filter(r => r.newConfidence === 'inferred').length,
  };

  const oldRate = (stats.oldExtracted / stats.total * 100).toFixed(1);
  const newRate = (stats.newExtracted / stats.total * 100).toFixed(1);
  const improvement = (stats.newExtracted - stats.oldExtracted);
  const improvementRate = ((stats.newExtracted - stats.oldExtracted) / stats.total * 100).toFixed(1);

  console.log('OVERALL STATISTICS');
  console.log('═'.repeat(80));
  console.log(`Total R&D Programs: ${stats.total}`);
  console.log();
  console.log(`OLD EXTRACTION (Database):`);
  console.log(`  ✓ Extracted: ${stats.oldExtracted}/${stats.total} (${oldRate}%)`);
  console.log(`  ✗ Not Extracted: ${stats.oldNotExtracted}/${stats.total}`);
  console.log();
  console.log(`NEW EXTRACTION (Enhanced Patterns):`);
  console.log(`  ✓ Extracted: ${stats.newExtracted}/${stats.total} (${newRate}%)`);
  console.log(`  ✗ Not Extracted: ${stats.newNotExtracted}/${stats.total}`);
  console.log();
  console.log(`IMPROVEMENT:`);
  console.log(`  🎯 Newly Extracted: +${stats.newlyExtracted} programs`);
  console.log(`  📊 Extraction Rate Increase: +${improvementRate}% (${oldRate}% → ${newRate}%)`);
  console.log(`  🔄 Values Changed: ${stats.valuesChanged} programs`);
  console.log(`  ⚠️  Lost Extraction: ${stats.lostExtraction} programs`);
  console.log();
  console.log(`CONFIDENCE BREAKDOWN:`);
  console.log(`  📍 Explicit (TRL keywords): ${stats.explicit}/${stats.newExtracted}`);
  console.log(`  🔍 Inferred (research stage): ${stats.inferred}/${stats.newExtracted}`);
  console.log('═'.repeat(80));
  console.log();

  // Step 4: Show newly extracted programs
  const newlyExtracted = results.filter(r => !r.wasExtracted && r.newExtracted);

  if (newlyExtracted.length > 0) {
    console.log('🆕 NEWLY EXTRACTED PROGRAMS (Sample - First 10):');
    console.log('═'.repeat(80));

    newlyExtracted.slice(0, 10).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title.substring(0, 60)}...`);
      console.log(`   TRL: ${result.newMinTRL}-${result.newMaxTRL} (${result.newConfidence})`);
      console.log(`   Text: ${(result.title + ' ' + (result.description || '')).substring(0, 100)}...`);
    });

    console.log();
    console.log('═'.repeat(80));
    console.log();
  }

  // Step 5: Show changed values
  const changedValues = results.filter(r => r.wasExtracted && r.newExtracted && r.changed);

  if (changedValues.length > 0) {
    console.log('🔄 CHANGED TRL VALUES (Sample - First 10):');
    console.log('═'.repeat(80));

    changedValues.slice(0, 10).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.title.substring(0, 60)}...`);
      console.log(`   OLD: TRL ${result.currentMinTRL}-${result.currentMaxTRL} (${result.currentTRLConfidence || 'unknown'})`);
      console.log(`   NEW: TRL ${result.newMinTRL}-${result.newMaxTRL} (${result.newConfidence})`);
    });

    console.log();
    console.log('═'.repeat(80));
    console.log();
  }

  // Step 6: Show failed extractions
  const failedExtractions = results.filter(r => !r.newExtracted);

  if (failedExtractions.length > 0) {
    console.log('❌ FAILED EXTRACTIONS (Sample - First 10):');
    console.log('═'.repeat(80));
    console.log(`These ${failedExtractions.length} programs still don't have TRL detected.\n`);

    failedExtractions.slice(0, 10).forEach((result, index) => {
      console.log(`${index + 1}. ${result.title.substring(0, 70)}...`);
      console.log(`   Text: ${(result.title + ' ' + (result.description || '')).substring(0, 100)}...`);
      console.log();
    });

    console.log('═'.repeat(80));
    console.log();
  }

  // Step 7: Success criteria check
  console.log('🎯 SUCCESS CRITERIA CHECK:');
  console.log('═'.repeat(80));
  console.log(`Target: ≥70% extraction rate`);
  console.log(`Achieved: ${newRate}%`);

  if (parseFloat(newRate) >= 70) {
    console.log(`✅ SUCCESS - Target achieved! (+${improvementRate}% improvement)`);
  } else {
    const gap = (70 - parseFloat(newRate)).toFixed(1);
    console.log(`⚠️  NEEDS IMPROVEMENT - Still ${gap}% below target`);
  }
  console.log('═'.repeat(80));
  console.log();

  await prisma.$disconnect();
}

main().catch(console.error);
