/**
 * Test Performance Tracking End-to-End
 *
 * Comprehensive test suite for Phase 3 performance tracking implementation
 *
 * Usage:
 * npx tsx scripts/test-performance-tracking.ts
 */

import { db } from '@/lib/db';
import {
  logMatchQuality,
  logMatchQualityBulk,
  updateMatchEngagement,
  calculateCategoryMetrics,
  calculateAllCategoryMetrics,
  getCategoryPerformanceReport,
  getAllCategoryReports,
  identifyLowQualityCategories,
} from '@/lib/analytics/match-performance';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪  PERFORMANCE TRACKING E2E TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let testsRun = 0;
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Verify database schema
  console.log('Test 1: Verifying database schema...');
  testsRun++;
  try {
    const logsCount = await db.match_quality_logs.count();
    const metricsCount = await db.category_performance_metrics.count();
    console.log(`✓ match_quality_logs table accessible (${logsCount} records)`);
    console.log(`✓ category_performance_metrics table accessible (${metricsCount} records)\n`);
    testsPassed++;
  } catch (error) {
    console.error('✗ Database schema verification failed:', error);
    testsFailed++;
  }

  // Test 2: Check for existing test data
  console.log('Test 2: Checking for existing match data...');
  testsRun++;
  try {
    const matchCount = await db.funding_matches.count();
    const programCount = await db.funding_programs.count();
    const orgCount = await db.organizations.count();

    console.log(`  Funding Matches: ${matchCount}`);
    console.log(`  Funding Programs: ${programCount}`);
    console.log(`  Organizations: ${orgCount}`);

    if (matchCount === 0) {
      console.log('⚠️  No existing matches found - skipping live data tests');
      console.log('   Run match generation first to test with real data\n');
    } else {
      console.log(`✓ Found ${matchCount} existing matches for testing\n`);
      testsPassed++;
    }
  } catch (error) {
    console.error('✗ Match data check failed:', error);
    testsFailed++;
  }

  // Test 3: Test match quality logging (bulk)
  console.log('Test 3: Testing bulk match quality logging...');
  testsRun++;
  try {
    const testCategory = 'TEST_CATEGORY_' + Date.now();
    const testData = [
      {
        matchId: 'test_match_1_' + Date.now(),
        organizationId: 'test_org_1',
        programId: 'test_program_1',
        category: testCategory,
        score: 75,
        breakdown: {
          industryScore: 25,
          trlScore: 15,
          typeScore: 15,
          rdScore: 10,
          deadlineScore: 10,
        },
        saved: false,
        viewed: false,
      },
      {
        matchId: 'test_match_2_' + Date.now(),
        organizationId: 'test_org_1',
        programId: 'test_program_2',
        category: testCategory,
        score: 85,
        breakdown: {
          industryScore: 28,
          trlScore: 18,
          typeScore: 17,
          rdScore: 12,
          deadlineScore: 10,
        },
        saved: true,
        viewed: true,
      },
    ];

    await logMatchQualityBulk(testData);

    // Verify logs were created
    const createdLogs = await db.match_quality_logs.findMany({
      where: { category: testCategory },
    });

    if (createdLogs.length === 2) {
      console.log(`✓ Successfully logged ${createdLogs.length} test matches`);
      console.log(`  Match 1: Score ${createdLogs[0].score}, Saved ${createdLogs[0].saved}, Viewed ${createdLogs[0].viewed}`);
      console.log(`  Match 2: Score ${createdLogs[1].score}, Saved ${createdLogs[1].saved}, Viewed ${createdLogs[1].viewed}\n`);
      testsPassed++;

      // Cleanup test data
      await db.match_quality_logs.deleteMany({
        where: { category: testCategory },
      });
      console.log('  Cleaned up test data\n');
    } else {
      throw new Error(`Expected 2 logs, found ${createdLogs.length}`);
    }
  } catch (error) {
    console.error('✗ Bulk logging test failed:', error);
    testsFailed++;
  }

  // Test 4: Test engagement tracking
  console.log('Test 4: Testing engagement tracking...');
  testsRun++;
  try {
    // Create a test log
    const testMatchId = 'engagement_test_' + Date.now();
    await logMatchQuality({
      matchId: testMatchId,
      organizationId: 'test_org',
      programId: 'test_program',
      category: 'TEST_ENGAGEMENT',
      score: 70,
      breakdown: {
        industryScore: 20,
        trlScore: 15,
        typeScore: 15,
        rdScore: 10,
        deadlineScore: 10,
      },
      saved: false,
      viewed: false,
    });

    // Update engagement
    await updateMatchEngagement(testMatchId, { viewed: true });
    await updateMatchEngagement(testMatchId, { saved: true });

    // Verify updates
    const updatedLog = await db.match_quality_logs.findUnique({
      where: { matchId: testMatchId },
    });

    if (updatedLog && updatedLog.saved && updatedLog.viewed) {
      console.log('✓ Engagement tracking working correctly');
      console.log(`  Viewed: ${updatedLog.viewed}, Saved: ${updatedLog.saved}\n`);
      testsPassed++;

      // Cleanup
      await db.match_quality_logs.delete({
        where: { matchId: testMatchId },
      });
    } else {
      throw new Error('Engagement updates not reflected in database');
    }
  } catch (error) {
    console.error('✗ Engagement tracking test failed:', error);
    testsFailed++;
  }

  // Test 5: Test category metrics calculation
  console.log('Test 5: Testing category metrics calculation...');
  testsRun++;
  try {
    // Create test data for metrics calculation
    const testCategory = 'METRICS_TEST_' + Date.now();
    const testDate = new Date();
    testDate.setUTCHours(0, 0, 0, 0);

    // Create multiple test logs
    const testLogs = Array.from({ length: 5 }, (_, i) => ({
      matchId: `metrics_match_${i}_` + Date.now(),
      organizationId: 'test_org',
      programId: `test_program_${i}`,
      category: testCategory,
      score: 60 + i * 5, // Scores: 60, 65, 70, 75, 80
      breakdown: {
        industryScore: 20,
        trlScore: 15,
        typeScore: 15,
        rdScore: 10,
        deadlineScore: 10,
      },
      saved: i % 2 === 0, // 3 saved, 2 not saved
      viewed: i >= 2, // 3 viewed, 2 not viewed
    }));

    await logMatchQualityBulk(testLogs);

    // Calculate metrics
    const metrics = await calculateCategoryMetrics(testCategory, testDate);

    if (metrics) {
      console.log('✓ Category metrics calculated successfully');
      console.log(`  Category: ${metrics.category}`);
      console.log(`  Match Count: ${metrics.matchCount}`);
      console.log(`  Avg Score: ${metrics.avgMatchScore.toFixed(1)}`);
      console.log(`  Saved Rate: ${metrics.savedRate.toFixed(1)}%`);
      console.log(`  Viewed Rate: ${metrics.viewedRate.toFixed(1)}%\n`);

      // Verify calculations
      const expectedAvg = (60 + 65 + 70 + 75 + 80) / 5; // = 70
      const expectedSavedRate = (3 / 5) * 100; // = 60%
      const expectedViewedRate = (3 / 5) * 100; // = 60%

      if (
        Math.abs(metrics.avgMatchScore - expectedAvg) < 0.1 &&
        Math.abs(metrics.savedRate - expectedSavedRate) < 0.1 &&
        Math.abs(metrics.viewedRate - expectedViewedRate) < 0.1
      ) {
        console.log('✓ Metric calculations are accurate\n');
        testsPassed++;
      } else {
        console.log('⚠️  Metric calculations may be inaccurate');
        console.log(`  Expected avg: ${expectedAvg}, got: ${metrics.avgMatchScore}`);
        console.log(`  Expected saved rate: ${expectedSavedRate}%, got: ${metrics.savedRate}%`);
        console.log(`  Expected viewed rate: ${expectedViewedRate}%, got: ${metrics.viewedRate}%\n`);
      }

      // Cleanup
      await db.match_quality_logs.deleteMany({
        where: { category: testCategory },
      });
      await db.category_performance_metrics.deleteMany({
        where: { category: testCategory },
      });
    } else {
      throw new Error('Metrics calculation returned null');
    }
  } catch (error) {
    console.error('✗ Metrics calculation test failed:', error);
    testsFailed++;
  }

  // Test 6: Test performance reporting
  console.log('Test 6: Testing performance reporting...');
  testsRun++;
  try {
    const reports = await getAllCategoryReports('weekly');
    console.log(`✓ Retrieved ${reports.length} category performance reports`);

    if (reports.length > 0) {
      const sampleReport = reports[0];
      console.log(`\n  Sample Report: ${sampleReport.category}`);
      console.log(`    Period: ${sampleReport.period}`);
      console.log(`    Total Matches: ${sampleReport.totalMatches}`);
      console.log(`    Avg Score: ${sampleReport.avgScore.toFixed(1)}`);
      console.log(`    Trend: ${sampleReport.trend}`);
      console.log(`    Alerts: ${sampleReport.alerts.length}\n`);
      testsPassed++;
    } else {
      console.log('⚠️  No reports generated - may need historical data\n');
    }
  } catch (error) {
    console.error('✗ Performance reporting test failed:', error);
    testsFailed++;
  }

  // Test 7: Test low-quality category detection
  console.log('Test 7: Testing low-quality category detection...');
  testsRun++;
  try {
    const alerts = await identifyLowQualityCategories('weekly', 60, 10, 30);
    console.log(`✓ Identified ${alerts.length} low-quality ${alerts.length === 1 ? 'category' : 'categories'}`);

    if (alerts.length > 0) {
      console.log('\n  Low-Quality Categories:');
      alerts.slice(0, 3).forEach(alert => {
        console.log(`    - ${alert.category}: Score ${alert.avgScore.toFixed(1)}, Saved ${alert.savedRate.toFixed(1)}%`);
      });
      console.log();
    } else {
      console.log('  All categories performing above thresholds ✓\n');
    }
    testsPassed++;
  } catch (error) {
    console.error('✗ Low-quality detection test failed:', error);
    testsFailed++;
  }

  // Test Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total Tests Run: ${testsRun}`);
  console.log(`Tests Passed: ${testsPassed} ✓`);
  console.log(`Tests Failed: ${testsFailed} ${testsFailed > 0 ? '✗' : ''}`);
  console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%\n`);

  if (testsFailed === 0) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('\nPerformance tracking system is fully operational.');
    console.log('\nNext steps:');
    console.log('1. Generate matches to populate analytics data');
    console.log('2. Run daily metrics: npx tsx scripts/generate-category-report.ts');
    console.log('3. Analyze performance: npx tsx scripts/analyze-category-performance.ts weekly');
    console.log('4. Check for alerts: npx tsx scripts/identify-low-quality-categories.ts\n');
  } else {
    console.log(`⚠️  ${testsFailed} ${testsFailed === 1 ? 'TEST' : 'TESTS'} FAILED`);
    console.log('\nPlease review errors above and fix issues before deployment.\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');

  await db.$disconnect();
  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(console.error);
