/**
 * Update Program Classifications Using Official Taxonomy
 *
 * Re-classifies all funding programs in the database using the refined
 * official Korean classification system (KSIC + NSTC).
 *
 * Changes:
 * - Programs requiring re-classification: 638 (38.0%)
 * - High confidence changes: 200 (11.9%)
 * - Fixes misclassifications (Nano/Materials, Nuclear, Bio programs)
 *
 * Run: npx tsx scripts/update-program-classifications.ts
 */

import { PrismaClient } from '@prisma/client';
import { classifyWithOfficialTaxonomy } from '../lib/scraping/parsers/official-category-mapper';

const db = new PrismaClient();

interface UpdateStats {
  totalPrograms: number;
  programsUpdated: number;
  programsUnchanged: number;
  byConfidence: {
    high: number;
    medium: number;
    low: number;
  };
  bySource: {
    nstc: number;
    ksic: number;
    ministry: number;
    fallback: number;
  };
  categoryChanges: Record<string, { from: number; to: number }>;
}

async function updateProgramClassifications() {
  console.log('🔄 Updating Program Classifications with Official Taxonomy\n');
  console.log('='.repeat(80));

  const stats: UpdateStats = {
    totalPrograms: 0,
    programsUpdated: 0,
    programsUnchanged: 0,
    byConfidence: { high: 0, medium: 0, low: 0 },
    bySource: { nstc: 0, ksic: 0, ministry: 0, fallback: 0 },
    categoryChanges: {},
  };

  try {
    // 1. Fetch all programs
    console.log('\n📚 Fetching all programs from database...');
    const programs = await db.funding_programs.findMany({
      select: {
        id: true,
        title: true,
        ministry: true,
        announcingAgency: true,
        category: true,
      },
    });

    stats.totalPrograms = programs.length;
    console.log(`   Found ${programs.length} programs\n`);

    // 2. Classify each program
    console.log('🔍 Re-classifying programs...\n');

    const updates: Array<{
      id: string;
      oldCategory: string;
      newCategory: string;
      confidence: string;
      source: string;
    }> = [];

    for (const program of programs) {
      const oldCategory = program.category || 'NULL';
      const result = classifyWithOfficialTaxonomy(
        program.title,
        program.ministry || undefined,
        program.announcingAgency || undefined
      );
      const newCategory = result.category;

      // Track statistics
      stats.byConfidence[result.confidence]++;
      stats.bySource[result.source]++;

      if (!stats.categoryChanges[newCategory]) {
        stats.categoryChanges[newCategory] = { from: 0, to: 0 };
      }
      stats.categoryChanges[newCategory].to++;

      if (!stats.categoryChanges[oldCategory]) {
        stats.categoryChanges[oldCategory] = { from: 0, to: 0 };
      }
      stats.categoryChanges[oldCategory].from++;

      // Track changes
      if (oldCategory !== newCategory) {
        stats.programsUpdated++;
        updates.push({
          id: program.id,
          oldCategory,
          newCategory,
          confidence: result.confidence,
          source: result.source,
        });

        // Show progress for every 100 updates
        if (updates.length % 100 === 0) {
          console.log(`   Processed ${updates.length} changes...`);
        }
      } else {
        stats.programsUnchanged++;
      }
    }

    console.log(`\n   Classification complete: ${updates.length} programs require updates\n`);

    // 3. Show preview of changes
    console.log('='.repeat(80));
    console.log('📊 CLASSIFICATION RESULTS PREVIEW\n');

    console.log('   Confidence Breakdown:');
    console.log(`      High:   ${stats.byConfidence.high} programs (${((stats.byConfidence.high / stats.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`      Medium: ${stats.byConfidence.medium} programs (${((stats.byConfidence.medium / stats.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`      Low:    ${stats.byConfidence.low} programs (${((stats.byConfidence.low / stats.totalPrograms) * 100).toFixed(1)}%)`);

    console.log('\n   Source Breakdown:');
    console.log(`      NSTC:     ${stats.bySource.nstc} programs (${((stats.bySource.nstc / stats.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`      KSIC:     ${stats.bySource.ksic} programs (${((stats.bySource.ksic / stats.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`      Ministry: ${stats.bySource.ministry} programs (${((stats.bySource.ministry / stats.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`      Fallback: ${stats.bySource.fallback} programs (${((stats.bySource.fallback / stats.totalPrograms) * 100).toFixed(1)}%)`);

    console.log('\n   Category Distribution (After Update):');
    Object.entries(stats.categoryChanges)
      .filter(([_, counts]) => counts.to > 0)
      .sort((a, b) => b[1].to - a[1].to)
      .forEach(([category, counts]) => {
        const pct = ((counts.to / stats.totalPrograms) * 100).toFixed(1);
        console.log(`      ${category.padEnd(25)} ${counts.to.toString().padStart(4)} (${pct.padStart(5)}%)`);
      });

    console.log('\n   Sample Changes:');
    updates.slice(0, 10).forEach((update, idx) => {
      console.log(`      ${idx + 1}. ${update.oldCategory.padEnd(15)} → ${update.newCategory.padEnd(15)} (${update.confidence} confidence, ${update.source})`);
    });

    if (updates.length > 10) {
      console.log(`      ... and ${updates.length - 10} more changes`);
    }

    // 4. Confirm before updating
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  READY TO UPDATE DATABASE\n');
    console.log(`   Programs to update: ${updates.length}`);
    console.log(`   Programs unchanged: ${stats.programsUnchanged}`);
    console.log(`\n   This will modify ${updates.length} records in the database.`);
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5. Execute updates in batches
    console.log('💾 Executing database updates...\n');

    const BATCH_SIZE = 100;
    let updated = 0;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(update =>
          db.funding_programs.update({
            where: { id: update.id },
            data: { category: update.newCategory },
          })
        )
      );

      updated += batch.length;
      console.log(`   Updated ${updated}/${updates.length} programs (${((updated / updates.length) * 100).toFixed(1)}%)`);
    }

    // 6. Final summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ DATABASE UPDATE COMPLETE\n');

    console.log('   Summary:');
    console.log(`      Total Programs:   ${stats.totalPrograms}`);
    console.log(`      Updated:          ${stats.programsUpdated} (${((stats.programsUpdated / stats.totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`      Unchanged:        ${stats.programsUnchanged} (${((stats.programsUnchanged / stats.totalPrograms) * 100).toFixed(1)}%)`);

    console.log('\n   Next Steps:');
    console.log('      1. ✅ Database updated with official classifications');
    console.log('      2. 🔄 Clear Redis cache: redis-cli FLUSHALL');
    console.log('      3. 🧪 Verify Innowave matches show only true ICT programs');
    console.log('      4. 📊 Monitor match quality over next 24 hours');

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ ERROR during update:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  updateProgramClassifications()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { updateProgramClassifications };
