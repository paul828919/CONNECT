/**
 * Test Official Classification System
 *
 * Validates the new official Korean classification mapper against:
 * 1. Current database programs (1,677 records)
 * 2. Known misclassification cases (Nano/Materials, Nuclear programs)
 * 3. Cross-category coverage
 */

import { PrismaClient } from '@prisma/client';
import { classifyWithOfficialTaxonomy, CLASSIFICATION_STATS } from '../lib/scraping/parsers/official-category-mapper';

const db = new PrismaClient();

async function testOfficialClassification() {
  console.log('🧪 Testing Official Korean Classification System\n');
  console.log('='.repeat(80));

  try {
    // 1. System Statistics
    console.log('\n📊 CLASSIFICATION SYSTEM STATISTICS\n');
    console.log(`   KSIC Mappings: ${CLASSIFICATION_STATS.ksicMappings}`);
    console.log(`   NSTC Mappings: ${CLASSIFICATION_STATS.nstcMappings}`);
    console.log(`   Total Keywords: ${CLASSIFICATION_STATS.totalKeywords}`);
    console.log(`   Estimated Coverage: ${CLASSIFICATION_STATS.coverageEstimate}`);

    // 2. Fetch all programs
    const programs = await db.funding_programs.findMany({
      select: {
        id: true,
        title: true,
        ministry: true,
        announcingAgency: true,
        category: true, // Current (possibly wrong) category
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n\n${'='.repeat(80)}`);
    console.log(`📚 DATABASE PROGRAMS: ${programs.length} total\n`);

    // 3. Test known misclassification cases
    console.log('\n' + '='.repeat(80));
    console.log('🔍 TESTING KNOWN MISCLASSIFICATION CASES\n');

    const testCases = [
      {
        title: '2024년 나노 및 소재기술개발사업',
        expected: 'MANUFACTURING',
        description: 'Nano & Materials program (previously misclassified as ICT)',
      },
      {
        title: '2024년 원자력안전연구개발사업',
        expected: 'ENERGY',
        description: 'Nuclear safety program (previously misclassified as ICT)',
      },
      {
        title: '2024년 정보통신방송기술개발',
        expected: 'ICT',
        description: 'ICT program (should remain ICT)',
      },
      {
        title: '2024년 바이오헬스 기술개발사업',
        expected: 'BIO_HEALTH',
        description: 'Bio/Health program',
      },
      {
        title: '2024년 친환경 저탄소 기술개발',
        expected: 'ENVIRONMENT',
        description: 'Environment program',
      },
    ];

    testCases.forEach((testCase, idx) => {
      const result = classifyWithOfficialTaxonomy(testCase.title);
      const isCorrect = result.category === testCase.expected;

      console.log(`\n▸ Test ${idx + 1}: ${testCase.description}`);
      console.log(`   Title: "${testCase.title}"`);
      console.log(`   Expected: ${testCase.expected}`);
      console.log(`   Got: ${result.category} (${result.confidence} confidence, source: ${result.source})`);
      console.log(`   Matched Keywords: ${result.matchedKeywords.join(', ')}`);
      console.log(`   ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
    });

    // 4. Re-classify all programs and compare
    console.log('\n\n' + '='.repeat(80));
    console.log('🔄 RE-CLASSIFYING ALL DATABASE PROGRAMS\n');

    const reclassificationResults = programs.map(program => {
      const oldCategory = program.category;
      const newResult = classifyWithOfficialTaxonomy(
        program.title,
        program.ministry || undefined,
        program.announcingAgency || undefined
      );

      return {
        program,
        oldCategory,
        newCategory: newResult.category,
        confidence: newResult.confidence,
        source: newResult.source,
        matchedKeywords: newResult.matchedKeywords,
        changed: oldCategory !== newResult.category,
      };
    });

    // 5. Analyze changes
    const changedPrograms = reclassificationResults.filter(r => r.changed);
    const byOldCategory = reclassificationResults.reduce((acc, r) => {
      const cat = r.oldCategory || 'NULL';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {} as Record<string, typeof reclassificationResults>);

    const byNewCategory = reclassificationResults.reduce((acc, r) => {
      const cat = r.newCategory;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(r);
      return acc;
    }, {} as Record<string, typeof reclassificationResults>);

    console.log(`   Total Programs Analyzed: ${programs.length}`);
    console.log(`   Programs Requiring Re-classification: ${changedPrograms.length} (${((changedPrograms.length / programs.length) * 100).toFixed(1)}%)`);
    console.log(`   Programs Unchanged: ${programs.length - changedPrograms.length} (${(((programs.length - changedPrograms.length) / programs.length) * 100).toFixed(1)}%)`);

    // 6. Category distribution comparison
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 CATEGORY DISTRIBUTION COMPARISON\n');

    console.log('   BEFORE (Current Database):');
    Object.entries(byOldCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([cat, items]) => {
        const pct = ((items.length / programs.length) * 100).toFixed(1);
        console.log(`      ${cat.padEnd(20)} ${items.length.toString().padStart(4)} (${pct.padStart(5)}%)`);
      });

    console.log('\n   AFTER (Official Classification):');
    Object.entries(byNewCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([cat, items]) => {
        const pct = ((items.length / programs.length) * 100).toFixed(1);
        const avgConfidence = items.filter(i => i.confidence === 'high').length / items.length;
        console.log(
          `      ${cat.padEnd(20)} ${items.length.toString().padStart(4)} (${pct.padStart(5)}%) ` +
          `[${(avgConfidence * 100).toFixed(0)}% high confidence]`
        );
      });

    // 7. Confidence breakdown
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 CLASSIFICATION CONFIDENCE BREAKDOWN\n');

    const byConfidence = reclassificationResults.reduce((acc, r) => {
      if (!acc[r.confidence]) acc[r.confidence] = 0;
      acc[r.confidence]++;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byConfidence).forEach(([conf, count]) => {
      const pct = ((count / programs.length) * 100).toFixed(1);
      console.log(`   ${conf.toUpperCase().padEnd(10)} ${count.toString().padStart(4)} (${pct.padStart(5)}%)`);
    });

    // 8. Source breakdown
    console.log('\n\n' + '='.repeat(80));
    console.log('📚 CLASSIFICATION SOURCE BREAKDOWN\n');

    const bySource = reclassificationResults.reduce((acc, r) => {
      if (!acc[r.source]) acc[r.source] = 0;
      acc[r.source]++;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(bySource).forEach(([source, count]) => {
      const pct = ((count / programs.length) * 100).toFixed(1);
      console.log(`   ${source.toUpperCase().padEnd(10)} ${count.toString().padStart(4)} (${pct.padStart(5)}%)`);
    });

    // 9. Sample changed programs
    console.log('\n\n' + '='.repeat(80));
    console.log('🔄 SAMPLE PROGRAMS REQUIRING RE-CLASSIFICATION\n');

    changedPrograms.slice(0, 20).forEach((r, idx) => {
      console.log(`\n   ${idx + 1}. ${r.program.title.substring(0, 60)}...`);
      console.log(`      OLD: ${r.oldCategory} → NEW: ${r.newCategory}`);
      console.log(`      Confidence: ${r.confidence} | Source: ${r.source}`);
      console.log(`      Keywords: ${r.matchedKeywords.slice(0, 5).join(', ')}`);
      console.log(`      Ministry: ${r.program.ministry}`);
      console.log(`      Agency: ${r.program.announcingAgency}`);
    });

    if (changedPrograms.length > 20) {
      console.log(`\n   ... and ${changedPrograms.length - 20} more programs requiring re-classification`);
    }

    // 10. Summary & Recommendations
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ SUMMARY & RECOMMENDATIONS\n');

    const highConfidenceChanges = changedPrograms.filter(r => r.confidence === 'high').length;
    const mediumConfidenceChanges = changedPrograms.filter(r => r.confidence === 'medium').length;
    const lowConfidenceChanges = changedPrograms.filter(r => r.confidence === 'low').length;

    console.log(`   Changes by Confidence:`);
    console.log(`      High:   ${highConfidenceChanges} programs (${((highConfidenceChanges / changedPrograms.length) * 100).toFixed(1)}%)`);
    console.log(`      Medium: ${mediumConfidenceChanges} programs (${((mediumConfidenceChanges / changedPrograms.length) * 100).toFixed(1)}%)`);
    console.log(`      Low:    ${lowConfidenceChanges} programs (${((lowConfidenceChanges / changedPrograms.length) * 100).toFixed(1)}%)`);

    console.log('\n   Next Steps:');
    console.log('      1. ✅ Review high-confidence changes (auto-approve)');
    console.log('      2. ⚠️  Review medium-confidence changes (manual review)');
    console.log('      3. ❌ Review low-confidence changes (manual classification)');
    console.log(`      4. 🔄 Update ${changedPrograms.length} programs in database`);
    console.log('      5. 🧪 Verify Innowave matches show only true ICT programs');

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.$disconnect();
  }
}

testOfficialClassification();
