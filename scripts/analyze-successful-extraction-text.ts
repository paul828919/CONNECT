/**
 * Analyze Successful Extraction Text Content
 *
 * Purpose: Examine text in programs where Budget/TRL extraction SUCCEEDED
 * to verify what patterns are working correctly.
 */

import { db } from '@/lib/db';

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('ANALYZING SUCCESSFUL EXTRACTION TEXT CONTENT');
  console.log('='.repeat(80));

  // ============================================================================
  // BUDGET EXTRACTION SUCCESSES
  // ============================================================================
  console.log('\n📊 BUDGET EXTRACTION SUCCESSES\n');

  const budgetSuccess = await db.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      budgetAmount: { not: null }
    },
    select: {
      id: true,
      title: true,
      budgetAmount: true,
      description: true
    },
    take: 3 // Analyze first 3 successful cases
  });

  console.log(`Found ${budgetSuccess.length} programs with budgetAmount extracted\n`);

  budgetSuccess.forEach((program, idx) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`BUDGET SUCCESS CASE ${idx + 1}/${budgetSuccess.length}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`ID: ${program.id}`);
    console.log(`Title: ${program.title.substring(0, 80)}...`);
    console.log(`Budget: ${(Number(program.budgetAmount!) / 1e9).toFixed(2)}억원 (${Number(program.budgetAmount!).toLocaleString()} won)`);

    if (program.description) {
      // Search for budget mentions in description
      const budgetKeywords = ['공고금액', '지원규모', '지원금액', '연구비', '사업비', '예산', '억원', '백만원'];
      const lines = program.description.split('\n');
      const relevantLines = lines.filter(line =>
        budgetKeywords.some(kw => line.includes(kw) && /\d/.test(line))
      );

      console.log(`\n💡 Budget-related lines found in description:`);
      relevantLines.slice(0, 5).forEach(line => {
        const trimmed = line.trim().substring(0, 100);
        if (trimmed.length > 0) {
          console.log(`   "${trimmed}${line.length > 100 ? '...' : ''}"`);
        }
      });
    } else {
      console.log('\n  ⚠️  NULL DESCRIPTION');
    }
  });

  // ============================================================================
  // TRL EXTRACTION SUCCESSES
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TRL EXTRACTION SUCCESSES');
  console.log('='.repeat(80) + '\n');

  const trlSuccess = await db.funding_programs.findMany({
    where: {
      scrapingSource: 'ntis',
      minTrl: { not: null },
      maxTrl: { not: null }
    },
    select: {
      id: true,
      title: true,
      minTrl: true,
      maxTrl: true,
      trlInferred: true,
      description: true
    },
    take: 3 // Analyze first 3 successful cases
  });

  console.log(`Found ${trlSuccess.length} programs with TRL extracted\n`);

  trlSuccess.forEach((program, idx) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`TRL SUCCESS CASE ${idx + 1}/${trlSuccess.length}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`ID: ${program.id}`);
    console.log(`Title: ${program.title.substring(0, 80)}...`);
    console.log(`TRL: ${program.minTrl}-${program.maxTrl} ${program.trlInferred ? '(inferred)' : '(explicit)'}`);

    if (program.description) {
      // Search for TRL mentions in description
      const trlKeywords = ['TRL', '기술성숙도', '기초연구', '응용연구', '상용화', '사업화', '실용화', '시제품', '원천기술'];
      const lines = program.description.split('\n');
      const relevantLines = lines.filter(line =>
        trlKeywords.some(kw => line.includes(kw))
      );

      console.log(`\n💡 TRL-related lines found in description:`);
      relevantLines.slice(0, 5).forEach(line => {
        const trimmed = line.trim().substring(0, 100);
        if (trimmed.length > 0) {
          console.log(`   "${trimmed}${line.length > 100 ? '...' : ''}"`);
        }
      });
    } else {
      console.log('\n  ⚠️  NULL DESCRIPTION');
    }
  });

  // ============================================================================
  // DATA QUALITY ANALYSIS
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('DATA QUALITY ANALYSIS');
  console.log('='.repeat(80));

  // Check for corrupted HWP descriptions (binary data)
  const allPrograms = await db.funding_programs.findMany({
    where: { scrapingSource: 'ntis' },
    select: {
      id: true,
      description: true
    }
  });

  const corruptedPrograms = allPrograms.filter(p =>
    p.description && (
      p.description.includes('#��ࡱ#') ||
      p.description.includes('R#o#o#t#') ||
      p.description.startsWith('#��')
    )
  );

  console.log(`\n📉 Data Quality Issues:`);
  console.log(`   Total programs: ${allPrograms.length}`);
  console.log(`   Corrupted HWP text: ${corruptedPrograms.length}/${allPrograms.length} (${(corruptedPrograms.length/allPrograms.length*100).toFixed(1)}%)`);
  console.log(`   Clean text: ${allPrograms.length - corruptedPrograms.length}/${allPrograms.length} (${((allPrograms.length - corruptedPrograms.length)/allPrograms.length*100).toFixed(1)}%)`);

  if (corruptedPrograms.length > 0) {
    console.log(`\n⚠️  Corrupted program IDs:`);
    corruptedPrograms.forEach(p => {
      console.log(`   - ${p.id.substring(0, 8)}...`);
    });
  }

  await db.$disconnect();
}

main().catch(console.error);
