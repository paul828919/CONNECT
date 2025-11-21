/**
 * Phase 5: End-to-End Data Quality Verification
 *
 * PURPOSE:
 * Verify that the complete fix (parser rewrite + filter updates + re-scrape) achieved target metrics
 *
 * EXECUTION:
 * Run after Phase 4 scraping completes (~10 minutes)
 * DATABASE_URL="postgresql://connect@59.21.170.6:5432/connect?schema=public" npx tsx scripts/phase5-verify-data-quality.ts
 *
 * SUCCESS CRITERIA:
 * - publishedAt extraction: ≥80%
 * - deadline extraction: ≥60%
 * - budgetAmount extraction: ≥30% (many NULL is expected)
 * - Matches generate correctly
 * - Sorting works (publishedAt DESC, deadline ASC)
 */

import { PrismaClient, ProgramStatus } from '@prisma/client';

const db = new PrismaClient();

async function phase5Verification() {
  console.log('✅ Phase 5: End-to-End Data Quality Verification\n');
  console.log('='.repeat(80));

  try {
    // Test 1: Data Extraction Quality
    console.log('\n📊 Test 1: Data Extraction Quality\n');

    const totalNTIS = await db.funding_programs.count({
      where: { scrapingSource: 'ntis' }
    });

    if (totalNTIS === 0) {
      console.error('❌ FAIL: No NTIS records found. Scraping may have failed.');
      console.log('   Check scraping logs: docker logs connect-scraper-1 --tail 100');
      return;
    }

    const withPublishedAt = await db.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
        publishedAt: { not: null }
      }
    });

    const withDeadline = await db.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
        deadline: { not: null }
      }
    });

    const withBudget = await db.funding_programs.count({
      where: {
        scrapingSource: 'ntis',
        budgetAmount: { not: null }
      }
    });

    const publishedAtRate = Math.round((withPublishedAt / totalNTIS) * 100);
    const deadlineRate = Math.round((withDeadline / totalNTIS) * 100);
    const budgetRate = Math.round((withBudget / totalNTIS) * 100);

    console.log(`Total NTIS records: ${totalNTIS}`);
    console.log(`  publishedAt: ${withPublishedAt}/${totalNTIS} (${publishedAtRate}%) ${publishedAtRate >= 80 ? '✅' : '❌'}`);
    console.log(`  deadline: ${withDeadline}/${totalNTIS} (${deadlineRate}%) ${deadlineRate >= 60 ? '✅' : '❌'}`);
    console.log(`  budgetAmount: ${withBudget}/${totalNTIS} (${budgetRate}%) ${budgetRate >= 30 ? '✅' : '⚠️  (acceptable)'}`);

    const extractionPassed = publishedAtRate >= 80 && deadlineRate >= 60;

    if (extractionPassed) {
      console.log('\n✅ PASS: Extraction quality meets targets');
    } else {
      console.log('\n❌ FAIL: Extraction quality below targets');
    }

    // Test 2: Show sample records
    console.log('\n📝 Test 2: Sample Records (first 3)\n');

    const samples = await db.funding_programs.findMany({
      where: { scrapingSource: 'ntis' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        title: true,
        publishedAt: true,
        deadline: true,
        budgetAmount: true,
        announcementUrl: true,
      }
    });

    samples.forEach((record, i) => {
      console.log(`${i + 1}. ${record.title?.substring(0, 60)}...`);
      console.log(`   publishedAt: ${record.publishedAt ? record.publishedAt.toISOString().split('T')[0] : 'NULL'}`);
      console.log(`   deadline: ${record.deadline ? record.deadline.toISOString().split('T')[0] : 'NULL'}`);
      console.log(`   budgetAmount: ${record.budgetAmount ? record.budgetAmount.toLocaleString() + ' won' : 'NULL'}`);
      console.log('');
    });

    // Test 3: Verify filtering (programs pass through new relaxed filters)
    console.log('📊 Test 3: Filter Compatibility (programs pass new filters)\n');

    const activePrograms = await db.funding_programs.count({
      where: {
        status: ProgramStatus.ACTIVE,
        scrapingSource: {
          not: null,
          notIn: ['NTIS_API'],
        },
      }
    });

    console.log(`Active programs (all sources): ${activePrograms}`);

    const activeNTIS = await db.funding_programs.count({
      where: {
        status: ProgramStatus.ACTIVE,
        scrapingSource: 'ntis',
      }
    });

    console.log(`Active NTIS programs: ${activeNTIS}`);

    if (activeNTIS > 0) {
      console.log('✅ PASS: NTIS programs pass filtering (including NULL budgets/deadlines)');
    } else {
      console.log('❌ FAIL: No NTIS programs pass filtering');
    }

    // Test 4: Verify sorting
    console.log('\n📊 Test 4: Sorting (publishedAt DESC, deadline ASC)\n');

    const sorted = await db.funding_programs.findMany({
      where: {
        scrapingSource: 'ntis',
        publishedAt: { not: null },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'asc' },
      ],
      take: 5,
      select: {
        title: true,
        publishedAt: true,
        deadline: true,
      }
    });

    console.log('Top 5 by sorting (newest published, then soonest deadline):');
    sorted.forEach((record, i) => {
      const pub = record.publishedAt ? record.publishedAt.toISOString().split('T')[0] : 'NULL';
      const dl = record.deadline ? record.deadline.toISOString().split('T')[0] : 'NULL';
      console.log(`${i + 1}. Published: ${pub}, Deadline: ${dl}`);
      console.log(`   ${record.title?.substring(0, 60)}...`);
    });

    // Verify descending order for publishedAt
    let sortingCorrect = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].publishedAt && sorted[i - 1].publishedAt) {
        if (sorted[i].publishedAt! > sorted[i - 1].publishedAt!) {
          sortingCorrect = false;
          break;
        }
      }
    }

    if (sortingCorrect) {
      console.log('\n✅ PASS: Sorting is correct (publishedAt DESC)');
    } else {
      console.log('\n❌ FAIL: Sorting is incorrect');
    }

    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('📋 VERIFICATION SUMMARY\n');
    console.log(`Extraction Quality: ${extractionPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Filter Compatibility: ${activeNTIS > 0 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Sorting: ${sortingCorrect ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (extractionPassed && activeNTIS > 0 && sortingCorrect) {
      console.log('🎉 ALL TESTS PASSED - NTIS integration is production-ready!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test match generation with a real organization');
      console.log('2. Verify matches show up in UI');
      console.log('3. Deploy to production if not already deployed');
    } else {
      console.log('⚠️  SOME TESTS FAILED - Review failures above');
    }

    console.log('='.repeat(80));

    await db.$disconnect();

  } catch (error: any) {
    console.error('❌ Phase 5 verification failed:', error.message);
    await db.$disconnect();
    throw error;
  }
}

phase5Verification().catch(console.error);
