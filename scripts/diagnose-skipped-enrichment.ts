/**
 * Diagnostic Script: Analyze Skipped Semantic Enrichment Programs
 *
 * Purpose: Query production DB to understand why 52 programs were skipped
 * during Phase 1 backfill. This helps identify patterns and fix the
 * semantic enrichment validation logic.
 *
 * Expected Failure Conditions (from isSemanticDataUsable):
 * 1. Low Confidence (< 0.7) - LLM uncertain about classification
 * 2. Validation Failure - semanticSubDomain === null because:
 *    - Field values don't match exact enum values
 *    - Missing one of two required fields
 *    - Category not in validation switch statement
 *
 * Usage:
 *   npx tsx scripts/diagnose-skipped-enrichment.ts [options]
 *
 * Options:
 *   --verbose    Show detailed program information
 *   --limit=N    Limit output to N programs per category
 */

import { db } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════
// CLI Arguments
// ═══════════════════════════════════════════════════════════════

function parseArgs(): {
  verbose: boolean;
  limit: number | null;
} {
  const args = process.argv.slice(2);
  return {
    verbose: args.includes('--verbose'),
    limit: args.find(a => a.startsWith('--limit='))
      ? parseInt(args.find(a => a.startsWith('--limit='))!.split('=')[1])
      : null,
  };
}

// ═══════════════════════════════════════════════════════════════
// Main Diagnostic Logic
// ═══════════════════════════════════════════════════════════════

async function runDiagnostic(): Promise<void> {
  const args = parseArgs();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('     SEMANTIC ENRICHMENT DIAGNOSTIC SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ─────────────────────────────────────────────────────────────
  // 1. Get overall statistics
  // ─────────────────────────────────────────────────────────────

  const totalActivePrograms = await db.funding_programs.count({
    where: {
      deadline: { gte: new Date() },
    },
  });

  const enrichedPrograms = await db.funding_programs.count({
    where: {
      deadline: { gte: new Date() },
      semanticEnrichedAt: { not: null },
    },
  });

  const skippedPrograms = await db.funding_programs.count({
    where: {
      deadline: { gte: new Date() },
      semanticEnrichedAt: null,
    },
  });

  console.log('📊 OVERALL STATISTICS');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Total Active Programs:     ${totalActivePrograms}`);
  console.log(`  With Semantic Enrichment:  ${enrichedPrograms} (${((enrichedPrograms / totalActivePrograms) * 100).toFixed(1)}%)`);
  console.log(`  Without Enrichment:        ${skippedPrograms} (${((skippedPrograms / totalActivePrograms) * 100).toFixed(1)}%)`);
  console.log('');

  // ─────────────────────────────────────────────────────────────
  // 2. Analyze skipped programs by category
  // ─────────────────────────────────────────────────────────────

  const skippedByCategory = await db.funding_programs.groupBy({
    by: ['category'],
    where: {
      deadline: { gte: new Date() },
      semanticEnrichedAt: null,
    },
    _count: { id: true },
  });

  const enrichedByCategory = await db.funding_programs.groupBy({
    by: ['category'],
    where: {
      deadline: { gte: new Date() },
      semanticEnrichedAt: { not: null },
    },
    _count: { id: true },
  });

  // Build a map for easy comparison
  const enrichedMap = new Map(enrichedByCategory.map(c => [c.category || 'NULL', c._count.id]));

  console.log('📂 SKIPPED PROGRAMS BY CATEGORY');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('  Category                  Skipped   Enriched   Skip Rate');
  console.log('  ─────────────────────────────────────────────────────────');

  skippedByCategory
    .sort((a, b) => b._count.id - a._count.id)
    .forEach(cat => {
      const category = cat.category || 'NULL';
      const skipped = cat._count.id;
      const enriched = enrichedMap.get(category) || 0;
      const total = skipped + enriched;
      const skipRate = total > 0 ? ((skipped / total) * 100).toFixed(1) : '0';
      console.log(`  ${category.padEnd(24)} ${String(skipped).padStart(7)}   ${String(enriched).padStart(8)}   ${skipRate}%`);
    });
  console.log('');

  // ─────────────────────────────────────────────────────────────
  // 3. Get sample skipped programs for analysis
  // ─────────────────────────────────────────────────────────────

  const sampleSkipped = await db.funding_programs.findMany({
    where: {
      deadline: { gte: new Date() },
      semanticEnrichedAt: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      keywords: true,
      ministry: true,
      announcingAgency: true,
      deadline: true,
    },
    orderBy: [
      { category: 'asc' },
      { deadline: 'asc' },
    ],
    take: args.limit ?? 50,
  });

  console.log('📋 SAMPLE SKIPPED PROGRAMS');
  console.log('─────────────────────────────────────────────────────────────');

  // Group by category for easier reading
  const groupedByCategory = new Map<string, typeof sampleSkipped>();
  sampleSkipped.forEach(p => {
    const cat = p.category || 'NULL';
    if (!groupedByCategory.has(cat)) {
      groupedByCategory.set(cat, []);
    }
    groupedByCategory.get(cat)!.push(p);
  });

  groupedByCategory.forEach((programs, category) => {
    console.log(`\n  📁 ${category} (${programs.length} programs)`);
    console.log('  ' + '─'.repeat(60));

    programs.slice(0, args.limit ?? 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title.substring(0, 70)}${p.title.length > 70 ? '...' : ''}`);
      if (args.verbose) {
        console.log(`     Ministry: ${p.ministry || 'N/A'}`);
        console.log(`     Agency: ${p.announcingAgency || 'N/A'}`);
        console.log(`     Keywords: ${p.keywords?.slice(0, 5).join(', ') || 'N/A'}`);
        console.log(`     Deadline: ${p.deadline?.toISOString().split('T')[0] || 'N/A'}`);
        if (p.description) {
          console.log(`     Description: ${p.description.substring(0, 100)}...`);
        }
        console.log('');
      }
    });

    if (programs.length > (args.limit ?? 5)) {
      console.log(`  ... and ${programs.length - (args.limit ?? 5)} more`);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Check for programs that might have low confidence
  // ─────────────────────────────────────────────────────────────

  const lowConfidencePrograms = await db.funding_programs.findMany({
    where: {
      deadline: { gte: new Date() },
      semanticConfidence: { lt: 0.7 },
      semanticEnrichedAt: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      semanticConfidence: true,
    },
    take: 20,
  });

  if (lowConfidencePrograms.length > 0) {
    console.log('\n\n⚠️  PROGRAMS WITH RECORDED LOW CONFIDENCE');
    console.log('─────────────────────────────────────────────────────────────');
    lowConfidencePrograms.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.category || 'NULL'}] ${p.title.substring(0, 50)}...`);
      console.log(`     Confidence: ${p.semanticConfidence?.toFixed(3) || 'N/A'}`);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Check categories that may not be handled in validation
  // ─────────────────────────────────────────────────────────────

  const knownCategories = [
    'BIO_HEALTH', 'BIOHEALTH', 'HEALTH', 'BIO',
    'ICT', 'IT', 'SOFTWARE',
    'MANUFACTURING', 'MANUFACTURE',
    'ENERGY',
    'AGRICULTURE', 'AGRI',
    'DEFENSE',
    'ENVIRONMENT', 'ENV',
  ];

  const unknownCategoryPrograms = await db.funding_programs.findMany({
    where: {
      deadline: { gte: new Date() },
      semanticEnrichedAt: null,
      category: {
        notIn: knownCategories,
      },
    },
    select: {
      id: true,
      title: true,
      category: true,
    },
    distinct: ['category'],
    take: 20,
  });

  if (unknownCategoryPrograms.length > 0) {
    console.log('\n\n❓ PROGRAMS WITH UNHANDLED CATEGORIES');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('  These categories may not be handled in validateSemanticSubDomain():');
    const uniqueCategories = [...new Set(unknownCategoryPrograms.map(p => p.category))];
    uniqueCategories.forEach(cat => {
      console.log(`  • ${cat || 'NULL'}`);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Summary & Recommendations
  // ─────────────────────────────────────────────────────────────

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('     RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════════');

  const highSkipCategories = skippedByCategory
    .filter(c => {
      const enriched = enrichedMap.get(c.category || 'NULL') || 0;
      const total = c._count.id + enriched;
      return total > 0 && (c._count.id / total) > 0.5;
    })
    .map(c => c.category || 'NULL');

  if (highSkipCategories.length > 0) {
    console.log('\n  🔴 HIGH SKIP RATE CATEGORIES (>50% skipped):');
    highSkipCategories.forEach(cat => console.log(`     • ${cat}`));
    console.log('\n  Consider:');
    console.log('     1. Lower confidence threshold from 0.7 to 0.5');
    console.log('     2. Allow partial semantic data (just hard filter field)');
    console.log('     3. Add category aliases to validation switch statement');
  }

  console.log('\n  💡 POSSIBLE FIXES:');
  console.log('     Option A: Relax validation rules');
  console.log('       - Lower confidence threshold: 0.7 → 0.5');
  console.log('       - Allow partial semantic data');
  console.log('       - Re-run backfill (~$2.68 for 52 programs)');
  console.log('');
  console.log('     Option B: Improve LLM prompt');
  console.log('       - Add explicit examples for each industry');
  console.log('       - Emphasize exact enum values required');
  console.log('       - Re-run with improved prompt');
  console.log('');
  console.log('     Option C: Score penalty approach (implemented in plan)');
  console.log('       - Non-enriched programs get -15 point penalty');
  console.log('       - Keyword inference for market compatibility');
  console.log('       - Works without re-running enrichment');

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

// ═══════════════════════════════════════════════════════════════
// Entry Point
// ═══════════════════════════════════════════════════════════════

runDiagnostic()
  .then(() => {
    console.log('Diagnostic script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostic script failed:', error);
    process.exit(1);
  });
