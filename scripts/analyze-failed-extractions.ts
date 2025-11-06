/**
 * Analyze Failed Extraction Cases
 *
 * Purpose: Examine actual text content of programs where budget/TRL extraction failed
 * to identify missing patterns and improve extraction logic.
 */

import { db } from '@/lib/db';
import { extractBudget } from '../lib/scraping/parsers/ntis-announcement-parser';
import { extractTRLRange } from '../lib/scraping/utils';

interface Program {
  id: string;
  title: string;
  description: string | null;
  budgetAmount: bigint | null;
  minTrl: number | null;
  maxTrl: number | null;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('ANALYZING FAILED EXTRACTION CASES');
  console.log('='.repeat(80));

  // Fetch programs
  const programs: Program[] = await db.$queryRaw`
    SELECT
      id,
      title,
      description,
      "budgetAmount",
      "minTrl",
      "maxTrl"
    FROM funding_programs
    WHERE "scrapingSource" = 'ntis'
    ORDER BY "createdAt" DESC
    LIMIT 10
  `;

  console.log(`\n📊 Analyzing ${programs.length} programs...\n`);

  // ============================================================================
  // BUDGET FAILURE ANALYSIS
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('BUDGET EXTRACTION FAILURES - TEXT CONTENT ANALYSIS');
  console.log('='.repeat(80));

  const budgetFailed = programs.filter(p => p.budgetAmount === null);
  console.log(`\nFound ${budgetFailed.length} programs with no budget extracted\n`);

  for (const program of budgetFailed) {
    console.log('\n' + '-'.repeat(80));
    console.log(`Program ID: ${program.id.substring(0, 12)}...`);
    console.log(`Title: ${program.title}`);
    console.log('-'.repeat(80));

    if (!program.description || program.description.length < 10) {
      console.log('❌ No description available (likely attachment parsing failed)');
      continue;
    }

    // Show first 1000 characters of description
    console.log('\n📄 Description Sample (first 1000 chars):');
    console.log(program.description.substring(0, 1000));

    // Check for budget-related keywords
    console.log('\n🔍 Budget-related keywords found:');
    const budgetKeywords = [
      '공고금액', '지원규모', '지원예산', '지원금액', '연구비', '총연구비',
      '총사업비', '사업비', '지원한도', '과제당', '억원', '백만원',
      '예산', '정부출연금', '연구개발비', '지원금'
    ];

    const foundKeywords = budgetKeywords.filter(keyword =>
      program.description!.includes(keyword)
    );

    if (foundKeywords.length > 0) {
      console.log(`   Found: ${foundKeywords.join(', ')}`);

      // Show context around each keyword
      foundKeywords.slice(0, 3).forEach(keyword => {
        const index = program.description!.indexOf(keyword);
        if (index >= 0) {
          const start = Math.max(0, index - 50);
          const end = Math.min(program.description!.length, index + 100);
          const context = program.description!.substring(start, end);
          console.log(`\n   Context for "${keyword}":`);
          console.log(`   ${context}`);
        }
      });

      // Try manual extraction to see if pattern works
      const manualExtraction = extractBudget(program.description!);
      console.log(`\n   Manual extraction result: ${manualExtraction ? `${(Number(manualExtraction) / 1000000000).toFixed(2)}억원` : 'NULL'}`);
    } else {
      console.log('   No budget keywords found in description');
    }
  }

  // ============================================================================
  // TRL FAILURE ANALYSIS
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('TRL EXTRACTION FAILURES - TEXT CONTENT ANALYSIS');
  console.log('='.repeat(80));

  const trlFailed = programs.filter(p => p.minTrl === null);
  console.log(`\nFound ${trlFailed.length} programs with no TRL extracted\n`);

  for (const program of trlFailed) {
    console.log('\n' + '-'.repeat(80));
    console.log(`Program ID: ${program.id.substring(0, 12)}...`);
    console.log(`Title: ${program.title}`);
    console.log('-'.repeat(80));

    if (!program.description || program.description.length < 10) {
      console.log('❌ No description available (likely attachment parsing failed)');
      continue;
    }

    // Check for TRL-related keywords
    console.log('\n🔍 TRL-related keywords found:');
    const trlKeywords = [
      'TRL', '기술성숙도', '기초연구', '원천기술', '응용연구', '개발연구',
      '시제품', '프로토타입', '실용화', '사업화', '상용화', '실증',
      '이론연구', '설계기준', '시험개발', '양산', '제품화'
    ];

    const foundKeywords = trlKeywords.filter(keyword =>
      program.description!.toLowerCase().includes(keyword.toLowerCase())
    );

    if (foundKeywords.length > 0) {
      console.log(`   Found: ${foundKeywords.join(', ')}`);

      // Show context around each keyword
      foundKeywords.slice(0, 3).forEach(keyword => {
        const regex = new RegExp(keyword, 'i');
        const match = program.description!.match(regex);
        if (match && match.index !== undefined) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(program.description!.length, match.index + 100);
          const context = program.description!.substring(start, end);
          console.log(`\n   Context for "${keyword}":`);
          console.log(`   ${context}`);
        }
      });

      // Try manual extraction to see if pattern works
      const manualExtraction = extractTRLRange(program.description!);
      console.log(`\n   Manual extraction result: ${manualExtraction ? `TRL ${manualExtraction.minTRL}-${manualExtraction.maxTRL} (${manualExtraction.confidence})` : 'NULL'}`);
    } else {
      console.log('   No TRL keywords found in description');
    }
  }

  console.log('\n' + '='.repeat(80));
  await db.$disconnect();
}

main().catch(console.error);
