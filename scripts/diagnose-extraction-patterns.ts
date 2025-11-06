/**
 * Diagnostic Script: Analyze Budget/TRL Extraction Patterns
 *
 * Purpose: Investigate why budget (60%) and TRL (30%) extraction rates
 * are below target (70%) after HWP conversion fix.
 *
 * Analysis:
 * 1. Show programs where budget extraction succeeded vs failed
 * 2. Show programs where TRL extraction succeeded vs failed
 * 3. Sample attachment text to understand content patterns
 * 4. Identify common failure patterns
 */

import { db } from '@/lib/db';

interface ProgramAnalysis {
  id: string;
  title: string;
  budgetAmount: bigint | null;
  minTrl: number | null;
  maxTrl: number | null;
  trlInferred: boolean | null;
  scrapingSource: string | null;
}

async function main() {
  console.log('\n='.repeat(80));
  console.log('BUDGET/TRL EXTRACTION PATTERN ANALYSIS');
  console.log('='.repeat(80));

  // Fetch all NTIS programs with relevant fields
  const programs: ProgramAnalysis[] = await db.$queryRaw`
    SELECT
      id,
      title,
      "budgetAmount",
      "minTrl",
      "maxTrl",
      "trlInferred",
      "scrapingSource"
    FROM funding_programs
    WHERE "scrapingSource" = 'ntis'
    ORDER BY "createdAt" DESC
    LIMIT 10
  `;

  console.log(`\n📊 Analyzing ${programs.length} NTIS programs...\n`);

  // ============================================================================
  // BUDGET ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('BUDGET EXTRACTION ANALYSIS');
  console.log('='.repeat(80));

  const budgetSuccess = programs.filter(p => p.budgetAmount !== null);
  const budgetFailed = programs.filter(p => p.budgetAmount === null);

  console.log(`\n✅ Budget Extracted Successfully: ${budgetSuccess.length}/${programs.length}`);
  budgetSuccess.forEach(p => {
    const budgetNum = Number(p.budgetAmount!);
    const billions = (budgetNum / 1000000000).toFixed(2);
    console.log(`   • ${p.title.substring(0, 60)}...`);
    console.log(`     Amount: ${billions}억원 (${budgetNum.toLocaleString()} won)`);
  });

  console.log(`\n❌ Budget Extraction Failed: ${budgetFailed.length}/${programs.length}`);
  budgetFailed.forEach(p => {
    console.log(`   • ${p.title.substring(0, 60)}...`);
  });

  // ============================================================================
  // TRL ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('TRL EXTRACTION ANALYSIS');
  console.log('='.repeat(80));

  const trlSuccess = programs.filter(p => p.minTrl !== null && p.maxTrl !== null);
  const trlFailed = programs.filter(p => p.minTrl === null || p.maxTrl === null);

  console.log(`\n✅ TRL Extracted Successfully: ${trlSuccess.length}/${programs.length}`);
  trlSuccess.forEach(p => {
    const inferredLabel = p.trlInferred ? '(inferred)' : '(explicit)';
    console.log(`   • ${p.title.substring(0, 60)}...`);
    console.log(`     TRL: ${p.minTrl}-${p.maxTrl} ${inferredLabel}`);
  });

  console.log(`\n❌ TRL Extraction Failed: ${trlFailed.length}/${programs.length}`);
  trlFailed.forEach(p => {
    console.log(`   • ${p.title.substring(0, 60)}...`);
  });

  // ============================================================================
  // FIELD-BY-FIELD SUCCESS MATRIX
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('FIELD EXTRACTION SUCCESS MATRIX');
  console.log('='.repeat(80));

  console.log('\nProgram ID | Budget | TRL | Both');
  console.log('-'.repeat(60));

  programs.forEach(p => {
    const hasBudget = p.budgetAmount !== null ? '✓' : '✗';
    const hasTRL = (p.minTrl !== null && p.maxTrl !== null) ? '✓' : '✗';
    const hasBoth = (p.budgetAmount !== null && p.minTrl !== null) ? '✓' : '✗';
    console.log(`${p.id.substring(0, 8)}... | ${hasBudget.padEnd(6)} | ${hasTRL.padEnd(3)} | ${hasBoth}`);
  });

  // ============================================================================
  // SUMMARY & RECOMMENDATIONS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(80));

  const budgetRate = (budgetSuccess.length / programs.length * 100).toFixed(1);
  const trlRate = (trlSuccess.length / programs.length * 100).toFixed(1);
  const bothRate = (programs.filter(p => p.budgetAmount !== null && p.minTrl !== null).length / programs.length * 100).toFixed(1);

  console.log(`\n📈 Current Extraction Rates:`);
  console.log(`   Budget:     ${budgetRate}% (${budgetSuccess.length}/${programs.length}) - Target: 70%`);
  console.log(`   TRL:        ${trlRate}% (${trlSuccess.length}/${programs.length}) - Target: 70%`);
  console.log(`   Both:       ${bothRate}%`);

  console.log(`\n💡 Analysis:`);
  if (parseFloat(budgetRate) < 70) {
    console.log(`   ⚠️  Budget extraction below target`);
    console.log(`       → Need to examine attachment text for failed cases`);
    console.log(`       → May need additional budget synonym patterns`);
  } else {
    console.log(`   ✓ Budget extraction meeting target`);
  }

  if (parseFloat(trlRate) < 70) {
    console.log(`   ⚠️  TRL extraction below target`);
    console.log(`       → Need to examine attachment text for failed cases`);
    console.log(`       → May need additional TRL keyword patterns`);
  } else {
    console.log(`   ✓ TRL extraction meeting target`);
  }

  console.log('\n' + '='.repeat(80));

  await db.$disconnect();
}

main().catch(console.error);
