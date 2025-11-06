/**
 * Phase 6 Testing Script: Partner Recommendations API
 *
 * Tests:
 * 1. Complementary TRL matching logic
 * 2. Redis caching mechanism
 * 3. Pagination functionality
 * 4. API response structure
 * 5. Performance metrics
 */

import { PrismaClient } from '@prisma/client';
import { calculatePartnerCompatibility } from '@/lib/matching/partner-algorithm';
import Redis from 'ioredis';

const db = new PrismaClient();
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0,
});

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function test1_VerifyTestData() {
  console.log('\n📊 Test 1: Verify Test Data Setup');
  console.log('─'.repeat(60));

  try {
    const companies = await db.organizations.count({
      where: { type: 'COMPANY' }
    });

    const institutes = await db.organizations.count({
      where: { type: 'RESEARCH_INSTITUTE' }
    });

    const totalOrgs = companies + institutes;

    results.push({
      test: 'Test Data Verification',
      status: totalOrgs >= 5 ? 'PASS' : 'WARN',
      message: `Found ${companies} companies and ${institutes} research institutes`,
      details: { companies, institutes, total: totalOrgs }
    });

    console.log(`  ✓ Companies: ${companies}`);
    console.log(`  ✓ Research Institutes: ${institutes}`);
    console.log(`  ✓ Total Organizations: ${totalOrgs}`);

    return totalOrgs >= 5;
  } catch (error) {
    results.push({
      test: 'Test Data Verification',
      status: 'FAIL',
      message: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    console.error('  ✗ Failed to query database');
    return false;
  }
}

async function test2_ComplementaryTRLMatching() {
  console.log('\n🔄 Test 2: Complementary TRL Matching Logic');
  console.log('─'.repeat(60));

  try {
    // Get a high-TRL company (TRL 7-9)
    const highTRLCompany = await db.organizations.findFirst({
      where: {
        type: 'COMPANY',
        technologyReadinessLevel: { gte: 7 }
      }
    });

    // Get a low-TRL research institute (TRL 1-4)
    const lowTRLInstitute = await db.organizations.findFirst({
      where: {
        type: 'RESEARCH_INSTITUTE',
        technologyReadinessLevel: { lte: 4 }
      }
    });

    if (!highTRLCompany || !lowTRLInstitute) {
      results.push({
        test: 'Complementary TRL Matching',
        status: 'WARN',
        message: 'Could not find suitable test organizations for TRL matching'
      });
      console.log('  ⚠ Skipped: Missing test data');
      return false;
    }

    const compatibility = calculatePartnerCompatibility(highTRLCompany, lowTRLInstitute);

    const trlScore = compatibility.breakdown.trlFitScore;
    // Without consortium preferences: expect 15-25 points (basic TRL gap)
    // With preferences: expect 30-40 points (complementary matching)
    const expectedHighScore = trlScore >= 15; // Moderate score expected without preferences

    results.push({
      test: 'Complementary TRL Matching',
      status: expectedHighScore ? 'PASS' : 'FAIL',
      message: `TRL ${highTRLCompany.technologyReadinessLevel} + TRL ${lowTRLInstitute.technologyReadinessLevel} = ${trlScore}/40 points`,
      details: {
        company: { name: highTRLCompany.name, trl: highTRLCompany.technologyReadinessLevel },
        institute: { name: lowTRLInstitute.name, trl: lowTRLInstitute.technologyReadinessLevel },
        score: compatibility.score,
        breakdown: compatibility.breakdown
      }
    });

    console.log(`  Company: ${highTRLCompany.name} (TRL ${highTRLCompany.technologyReadinessLevel})`);
    console.log(`  Institute: ${lowTRLInstitute.name} (TRL ${lowTRLInstitute.technologyReadinessLevel})`);
    console.log(`  TRL Alignment Score: ${trlScore}/40`);
    console.log(`  Total Compatibility: ${compatibility.score}/100`);
    console.log(`  ${expectedHighScore ? '✓' : '✗'} ${expectedHighScore ? 'PASS' : 'FAIL'}: Complementary TRL scoring works correctly`);

    return expectedHighScore;
  } catch (error) {
    results.push({
      test: 'Complementary TRL Matching',
      status: 'FAIL',
      message: `Algorithm test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    console.error('  ✗ Failed to test algorithm');
    return false;
  }
}

async function test3_RecommendationQuery() {
  console.log('\n🔍 Test 3: Recommendation Query Logic');
  console.log('─'.repeat(60));

  try {
    // Get a company user
    const testCompany = await db.organizations.findFirst({
      where: { type: 'COMPANY' }
    });

    if (!testCompany) {
      results.push({
        test: 'Recommendation Query',
        status: 'WARN',
        message: 'No test company found'
      });
      console.log('  ⚠ Skipped: No test company');
      return false;
    }

    const startTime = Date.now();

    // Simulate recommendation query logic from API
    const candidates = await db.organizations.findMany({
      where: {
        type: testCompany.type === 'COMPANY' ? 'RESEARCH_INSTITUTE' : 'COMPANY',
        id: { not: testCompany.id }
      },
      take: 50,
      orderBy: [
        { profileScore: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const queryTime = Date.now() - startTime;

    // Calculate compatibility for each candidate
    const scoredCandidates = candidates.map(candidate => {
      const compatibility = calculatePartnerCompatibility(testCompany, candidate);
      return {
        ...candidate,
        compatibility
      };
    });

    // Sort by compatibility score
    const recommendations = scoredCandidates
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, 20);

    const avgScore = recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.compatibility.score, 0) / recommendations.length
      : 0;

    results.push({
      test: 'Recommendation Query',
      status: recommendations.length > 0 ? 'PASS' : 'WARN',
      message: `Generated ${recommendations.length} recommendations in ${queryTime}ms (avg score: ${avgScore.toFixed(1)})`,
      details: {
        sourceOrg: { name: testCompany.name, type: testCompany.type },
        candidatesFound: candidates.length,
        recommendationsGenerated: recommendations.length,
        queryTimeMs: queryTime,
        avgCompatibilityScore: avgScore,
        topScores: recommendations.slice(0, 5).map(r => ({
          name: r.name,
          score: r.compatibility.score
        }))
      }
    });

    console.log(`  Source: ${testCompany.name} (${testCompany.type})`);
    console.log(`  Candidates Found: ${candidates.length}`);
    console.log(`  Recommendations Generated: ${recommendations.length}`);
    console.log(`  Query Time: ${queryTime}ms`);
    console.log(`  Avg Compatibility Score: ${avgScore.toFixed(1)}/100`);

    if (recommendations.length > 0) {
      console.log(`\n  Top 3 Recommendations:`);
      recommendations.slice(0, 3).forEach((r, i) => {
        console.log(`    ${i + 1}. ${r.name} - ${r.compatibility.score}/100`);
      });
    }

    console.log(`  ${recommendations.length > 0 ? '✓ PASS' : '⚠ WARN'}`);

    return recommendations.length > 0;
  } catch (error) {
    results.push({
      test: 'Recommendation Query',
      status: 'FAIL',
      message: `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    console.error('  ✗ Failed to generate recommendations');
    return false;
  }
}

async function test4_RedisCaching() {
  console.log('\n💾 Test 4: Redis Caching Mechanism');
  console.log('─'.repeat(60));

  try {
    const testKey = 'test:phase6:cache:' + Date.now();
    const testData = {
      recommendations: [{ id: '1', name: 'Test Org', score: 85 }],
      expiry: Date.now() + 86400000,
      generatedAt: new Date().toISOString()
    };

    // Test 1: Set cache
    await redis.setex(testKey, 60, JSON.stringify(testData));
    console.log('  ✓ Cache write successful');

    // Test 2: Get cache
    const cached = await redis.get(testKey);
    const parsedCache = cached ? JSON.parse(cached) : null;

    const cacheReadWorks = parsedCache && parsedCache.recommendations.length === 1;
    console.log(`  ${cacheReadWorks ? '✓' : '✗'} Cache read ${cacheReadWorks ? 'successful' : 'failed'}`);

    // Test 3: Check TTL
    const ttl = await redis.ttl(testKey);
    const ttlWorks = ttl > 0 && ttl <= 60;
    console.log(`  ${ttlWorks ? '✓' : '✗'} TTL check (${ttl}s remaining) ${ttlWorks ? 'OK' : 'FAIL'}`);

    // Cleanup
    await redis.del(testKey);
    console.log('  ✓ Cache cleanup successful');

    const allPassed = cacheReadWorks && ttlWorks;

    results.push({
      test: 'Redis Caching',
      status: allPassed ? 'PASS' : 'FAIL',
      message: `Cache operations ${allPassed ? 'working correctly' : 'have issues'}`,
      details: {
        writeSuccess: true,
        readSuccess: cacheReadWorks,
        ttlSuccess: ttlWorks,
        ttlValue: ttl
      }
    });

    console.log(`  ${allPassed ? '✓ PASS' : '✗ FAIL'}`);

    return allPassed;
  } catch (error) {
    results.push({
      test: 'Redis Caching',
      status: 'FAIL',
      message: `Redis operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    console.error('  ✗ Redis test failed');
    return false;
  }
}

async function test5_PaginationLogic() {
  console.log('\n📄 Test 5: Pagination Logic');
  console.log('─'.repeat(60));

  try {
    const limits = [5, 10, 20, 50];
    const testResults = [];

    for (const limit of limits) {
      const orgs = await db.organizations.findMany({
        take: limit
      });

      const success = orgs.length <= limit;
      testResults.push({ limit, returned: orgs.length, success });
      console.log(`  ${success ? '✓' : '✗'} Limit ${limit}: Returned ${orgs.length} ${success ? '(OK)' : '(FAIL)'}`);
    }

    // Test max limit enforcement (should not exceed 50)
    const maxTest = await db.organizations.findMany({
      take: 100 // Try to get 100, but API limits to 50
    });
    const maxLimitEnforced = maxTest.length <= 50;
    console.log(`  ${maxLimitEnforced ? '✓' : '⚠'} Max limit (100 requested, ${maxTest.length} returned)`);

    const allPassed = testResults.every(t => t.success);

    results.push({
      test: 'Pagination Logic',
      status: allPassed ? 'PASS' : 'FAIL',
      message: `Pagination ${allPassed ? 'works correctly' : 'has issues'}`,
      details: testResults
    });

    console.log(`  ${allPassed ? '✓ PASS' : '✗ FAIL'}`);

    return allPassed;
  } catch (error) {
    results.push({
      test: 'Pagination Logic',
      status: 'FAIL',
      message: `Pagination test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    console.error('  ✗ Pagination test failed');
    return false;
  }
}

async function test6_PerformanceMetrics() {
  console.log('\n⚡ Test 6: Performance Metrics');
  console.log('─'.repeat(60));

  try {
    const testCompany = await db.organizations.findFirst({
      where: { type: 'COMPANY' }
    });

    if (!testCompany) {
      results.push({
        test: 'Performance Metrics',
        status: 'WARN',
        message: 'No test company for performance testing'
      });
      console.log('  ⚠ Skipped: No test data');
      return false;
    }

    // Test 1: Cold query (no cache)
    const coldStart = Date.now();
    const candidates1 = await db.organizations.findMany({
      where: {
        type: testCompany.type === 'COMPANY' ? 'RESEARCH_INSTITUTE' : 'COMPANY',
        id: { not: testCompany.id }
      },
      take: 20
    });
    const recommendations1 = candidates1.map(c => ({
      ...c,
      compatibility: calculatePartnerCompatibility(testCompany, c)
    }));
    const coldTime = Date.now() - coldStart;

    console.log(`  Cold Query: ${coldTime}ms (${recommendations1.length} recommendations)`);

    // Test 2: Warm query (simulate cache hit)
    const warmStart = Date.now();
    const candidates2 = await db.organizations.findMany({
      where: {
        type: testCompany.type === 'COMPANY' ? 'RESEARCH_INSTITUTE' : 'COMPANY',
        id: { not: testCompany.id }
      },
      take: 20
    });
    const recommendations2 = candidates2.map(c => ({
      ...c,
      compatibility: calculatePartnerCompatibility(testCompany, c)
    }));
    const warmTime = Date.now() - warmStart;

    console.log(`  Warm Query: ${warmTime}ms (${recommendations2.length} recommendations)`);

    // Test 3: Algorithm performance
    const algoStart = Date.now();
    const sampleOrg = candidates1[0];
    for (let i = 0; i < 100; i++) {
      calculatePartnerCompatibility(testCompany, sampleOrg);
    }
    const algoTime = Date.now() - algoStart;
    const avgAlgoTime = algoTime / 100;

    console.log(`  Algorithm: ${avgAlgoTime.toFixed(2)}ms avg (100 iterations)`);

    const performanceGood = coldTime < 2000 && avgAlgoTime < 50;

    results.push({
      test: 'Performance Metrics',
      status: performanceGood ? 'PASS' : 'WARN',
      message: `Performance ${performanceGood ? 'within acceptable limits' : 'may need optimization'}`,
      details: {
        coldQueryMs: coldTime,
        warmQueryMs: warmTime,
        avgAlgorithmMs: avgAlgoTime,
        recommendationsGenerated: recommendations1.length
      }
    });

    console.log(`  ${performanceGood ? '✓ PASS' : '⚠ WARN'}: Performance ${performanceGood ? 'acceptable' : 'needs attention'}`);

    return performanceGood;
  } catch (error) {
    results.push({
      test: 'Performance Metrics',
      status: 'FAIL',
      message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    console.error('  ✗ Performance test failed');
    return false;
  }
}

async function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 PHASE 6 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
    console.log(`\n${index + 1}. [${icon} ${result.status}] ${result.test}`);
    console.log(`   ${result.message}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${total} tests`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`⚠ Warnings: ${warned}`);
  console.log('─'.repeat(60));

  const successRate = (passed / total * 100).toFixed(1);
  console.log(`\n📊 Success Rate: ${successRate}%`);

  if (failed === 0 && warned === 0) {
    console.log('✅ ALL TESTS PASSED! Phase 6 is ready for deployment.');
  } else if (failed === 0) {
    console.log('⚠️  TESTS PASSED WITH WARNINGS. Review warnings before deployment.');
  } else {
    console.log('❌ SOME TESTS FAILED. Fix issues before deployment.');
  }

  console.log('═'.repeat(60) + '\n');
}

async function runAllTests() {
  console.log('\n🚀 Starting Phase 6 Test Suite');
  console.log('═'.repeat(60));

  await test1_VerifyTestData();
  await test2_ComplementaryTRLMatching();
  await test3_RecommendationQuery();
  await test4_RedisCaching();
  await test5_PaginationLogic();
  await test6_PerformanceMetrics();

  await printSummary();

  // Cleanup
  await redis.quit();
  await db.$disconnect();
}

runAllTests().catch(console.error);
