/**
 * Analyze Failed Extraction Text Content
 *
 * Purpose: Examine actual text content in programs where Budget/TRL extraction failed
 * to identify missing extraction patterns in the parser logic.
 *
 * Strategy:
 * 1. Find programs where budgetAmount is null
 * 2. Show sample text from their descriptions
 * 3. Find programs where minTrl/maxTrl are null
 * 4. Show sample text from their descriptions
 * 5. Identify what Korean patterns are present that our regex is missing
 */

import { db } from '@/lib/db';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('ANALYZING FAILED EXTRACTION TEXT CONTENT');
  console.log('='.repeat(80));

  // ============================================================================
  // BUDGET EXTRACTION FAILURES
  // ============================================================================
  console.log('\n📊 BUDGET EXTRACTION FAILURES\n');

  const budgetFailed = await db.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      budgetAmount: null
    },
    select: {
      id: true,
      title: true,
      description: true
    },
    take: 4 // Analyze first 4 failed cases
  });

  console.log(`Found ${budgetFailed.length} programs with null budgetAmount\n`);

  budgetFailed.forEach((program, idx) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`BUDGET FAILED CASE ${idx + 1}/${budgetFailed.length}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`ID: ${program.id}`);
    console.log(`Title: ${program.title.substring(0, 80)}...`);
    console.log(`\nDescription Sample (first 1500 chars):`);

    if (!program.description) {
      console.log('  ⚠️  NULL DESCRIPTION (no text to extract from)');
    } else {
      // Show first 1500 characters to understand budget patterns
      const sample = program.description.substring(0, 1500);
      console.log(sample);

      // Search for potential budget keywords
      const budgetKeywords = ['공고금액', '지원규모', '지원금액', '연구비', '사업비', '예산', '정부출연금', '과제당'];
      const foundKeywords = budgetKeywords.filter(kw => sample.includes(kw));

      if (foundKeywords.length > 0) {
        console.log(`\n  💡 Found budget keywords: ${foundKeywords.join(', ')}`);
      } else {
        console.log(`\n  ❌ No budget keywords found in sample`);
      }
    }
  });

  // ============================================================================
  // TRL EXTRACTION FAILURES
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TRL EXTRACTION FAILURES');
  console.log('='.repeat(80) + '\n');

  const trlFailed = await db.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      OR: [
        { minTrl: null },
        { maxTrl: null }
      ]
    },
    select: {
      id: true,
      title: true,
      description: true
    },
    take: 4 // Analyze first 4 failed cases
  });

  console.log(`Found ${trlFailed.length} programs with null TRL\n`);

  trlFailed.forEach((program, idx) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`TRL FAILED CASE ${idx + 1}/${trlFailed.length}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`ID: ${program.id}`);
    console.log(`Title: ${program.title.substring(0, 80)}...`);
    console.log(`\nDescription Sample (first 1500 chars):`);

    if (!program.description) {
      console.log('  ⚠️  NULL DESCRIPTION (no text to extract from)');
    } else {
      // Show first 1500 characters to understand TRL patterns
      const sample = program.description.substring(0, 1500);
      console.log(sample);

      // Search for potential TRL keywords
      const trlKeywords = ['TRL', '기술성숙도', '기초연구', '응용연구', '상용화', '사업화', '실용화', '시제품'];
      const foundKeywords = trlKeywords.filter(kw => sample.includes(kw));

      if (foundKeywords.length > 0) {
        console.log(`\n  💡 Found TRL keywords: ${foundKeywords.join(', ')}`);
      } else {
        console.log(`\n  ❌ No TRL keywords found in sample`);
      }
    }
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));

  const totalPrograms = await db.funding_programs.count({
    where: { scrapingSource: 'ntis' }
  });

  const budgetSuccessCount = await db.funding_programs.count({
    where: {
      scrapingSource: 'ntis',
      budgetAmount: { not: null }
    }
  });

  const trlSuccessCount = await db.funding_programs.count({
    where: {
      scrapingSource: 'ntis',
      minTrl: { not: null },
      maxTrl: { not: null }
    }
  });

  console.log(`\n📈 Current Status:`);
  console.log(`   Total NTIS programs: ${totalPrograms}`);
  console.log(`   Budget extracted: ${budgetSuccessCount}/${totalPrograms} (${(budgetSuccessCount/totalPrograms*100).toFixed(1)}%)`);
  console.log(`   TRL extracted: ${trlSuccessCount}/${totalPrograms} (${(trlSuccessCount/totalPrograms*100).toFixed(1)}%)`);
  console.log(`\n🎯 Target: ≥70% for both Budget and TRL`);

  await db.$disconnect();
}

main().catch(console.error);
