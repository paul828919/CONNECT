/**
 * v4.0 Keyword Classification Verification Script
 *
 * Verifies that the keyword-based matching algorithm is correctly
 * classifying all funding programs in the database.
 *
 * Run with: npx tsx scripts/verify-v4-keyword-classification.ts
 *
 * @see /docs/matching-quality-assessment-2026-01-16.md for algorithm design
 */

import { PrismaClient } from '@prisma/client';
import {
  classifyProgram,
  getIndustryKoreanLabel,
  type IndustryCategory,
} from '../lib/matching/keyword-classifier';

const db = new PrismaClient();

async function verifyKeywordClassification() {
  console.log('\n🔍 v4.0 Keyword Classification Verification\n');
  console.log('='.repeat(60));

  try {
    // 1. Query all ACTIVE programs
    const programs = await db.funding_programs.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        title: true,
        ministry: true,
        announcingAgency: true,
        keywords: true,
        agencyId: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\n📊 Total ACTIVE programs: ${programs.length}\n`);

    if (programs.length === 0) {
      console.log('⚠️ No ACTIVE programs found. Checking all programs...');
      const allPrograms = await db.funding_programs.findMany({
        select: { status: true },
      });
      console.log(`Total programs in database: ${allPrograms.length}`);
      const byStatus = allPrograms.reduce(
        (acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      console.log('By status:', byStatus);
      await db.$disconnect();
      return;
    }

    // 2. Classify each program using the v4.0 keyword algorithm
    const classifications = programs.map((program) => {
      const result = classifyProgram(program.title, null, program.ministry);

      return {
        ...program,
        classifiedIndustry: result.industry,
        confidence: result.confidence,
        matchedKeywords: result.matchedKeywords,
        ministryBased: result.ministryBased,
      };
    });

    // 3. Group by classified industry
    const byIndustry: Record<string, typeof classifications> = {};
    classifications.forEach((c) => {
      if (!byIndustry[c.classifiedIndustry]) byIndustry[c.classifiedIndustry] = [];
      byIndustry[c.classifiedIndustry].push(c);
    });

    // 4. Print distribution
    console.log('📈 Industry Distribution:\n');
    const sortedIndustries = Object.entries(byIndustry).sort(
      ([, a], [, b]) => b.length - a.length
    );

    sortedIndustries.forEach(([industry, items]) => {
      const percent = ((items.length / classifications.length) * 100).toFixed(1);
      const koreanLabel = getIndustryKoreanLabel(industry as IndustryCategory);
      console.log(
        `  ${industry.padEnd(20)} ${items.length.toString().padStart(4)} (${percent.padStart(5)}%) - ${koreanLabel}`
      );
    });

    // 5. Show examples for NEW categories introduced in v4.0
    console.log('\n\n📋 New Category Samples (v4.0):\n');
    const newCategories: IndustryCategory[] = [
      'MARINE_FISHERIES',
      'MARINE_SECURITY',
      'FORESTRY',
      'VETERINARY',
      'AEROSPACE',
      'TRANSPORTATION',
      'AGRICULTURE',
    ];

    newCategories.forEach((category) => {
      const items = byIndustry[category] || [];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(
        `${category} (${getIndustryKoreanLabel(category)}): ${items.length} programs`
      );
      console.log('─'.repeat(60));

      if (items.length > 0) {
        items.slice(0, 3).forEach((item, i) => {
          console.log(`\n  ${i + 1}. [신뢰도: ${item.confidence.toFixed(2)}]`);
          console.log(`     제목: ${item.title.substring(0, 70)}${item.title.length > 70 ? '...' : ''}`);
          console.log(`     부처: ${item.ministry || 'N/A'}`);
          console.log(
            `     키워드: ${item.matchedKeywords.slice(0, 5).join(', ') || 'N/A'}`
          );
          console.log(`     부처기반: ${item.ministryBased ? '예' : '아니오'}`);
        });
        if (items.length > 3) {
          console.log(`\n  ... 외 ${items.length - 3}개 프로그램`);
        }
      } else {
        console.log('  ⚠️ No programs in this category');
      }
    });

    // 6. Check for GENERAL fallback (should be minimal)
    const generalPrograms = byIndustry['GENERAL'] || [];
    console.log(`\n\n${'─'.repeat(60)}`);
    console.log(`⚠️ GENERAL Category (fallback): ${generalPrograms.length} programs`);
    console.log('─'.repeat(60));

    if (generalPrograms.length > 0) {
      console.log('\nThese programs could not be classified into specific industries:\n');
      generalPrograms.slice(0, 10).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.title.substring(0, 60)}${item.title.length > 60 ? '...' : ''}`);
        console.log(`     부처: ${item.ministry || 'UNKNOWN'}`);
        console.log(`     키워드: ${item.matchedKeywords.join(', ') || 'NONE'}\n`);
      });
      if (generalPrograms.length > 10) {
        console.log(`  ... 외 ${generalPrograms.length - 10}개 프로그램`);
      }
    }

    // 7. Ministry-based vs Keyword-based classification breakdown
    console.log(`\n\n${'─'.repeat(60)}`);
    console.log('📊 Classification Method Breakdown');
    console.log('─'.repeat(60));

    const ministryBasedCount = classifications.filter((c) => c.ministryBased).length;
    const keywordOnlyCount = classifications.filter((c) => !c.ministryBased).length;

    console.log(
      `  부처 기반: ${ministryBasedCount} (${((ministryBasedCount / classifications.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `  키워드 전용: ${keywordOnlyCount} (${((keywordOnlyCount / classifications.length) * 100).toFixed(1)}%)`
    );

    // 8. Confidence distribution
    console.log(`\n\n${'─'.repeat(60)}`);
    console.log('📊 Confidence Distribution');
    console.log('─'.repeat(60));

    const highConfidence = classifications.filter((c) => c.confidence >= 0.8).length;
    const mediumConfidence = classifications.filter(
      (c) => c.confidence >= 0.5 && c.confidence < 0.8
    ).length;
    const lowConfidence = classifications.filter((c) => c.confidence < 0.5).length;

    console.log(
      `  높음 (≥0.8): ${highConfidence} (${((highConfidence / classifications.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `  중간 (0.5-0.8): ${mediumConfidence} (${((mediumConfidence / classifications.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `  낮음 (<0.5): ${lowConfidence} (${((lowConfidence / classifications.length) * 100).toFixed(1)}%)`
    );

    // 9. Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total programs verified: ${programs.length}`);
    console.log(`  Industries classified: ${Object.keys(byIndustry).length}`);
    console.log(`  New categories coverage:`);
    newCategories.forEach((cat) => {
      const count = (byIndustry[cat] || []).length;
      const status = count > 0 ? '✅' : '⚠️';
      console.log(`    ${status} ${cat}: ${count} programs`);
    });
    console.log(`  GENERAL fallback: ${generalPrograms.length} programs`);

    const generalPercent = (generalPrograms.length / classifications.length) * 100;
    if (generalPercent < 5) {
      console.log(`\n  ✅ GENERAL fallback is ${generalPercent.toFixed(1)}% (target: <5%)`);
    } else {
      console.log(`\n  ⚠️ GENERAL fallback is ${generalPercent.toFixed(1)}% (target: <5%)`);
    }

    await db.$disconnect();
  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
    await db.$disconnect();
  }
}

verifyKeywordClassification();
