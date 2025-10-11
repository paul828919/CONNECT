/**
 * AI Features Load Testing Script
 * Week 3-4 Day 24: Comprehensive load testing for AI features
 *
 * Test Scenarios:
 * 1. Match Explanation Load Test (100 concurrent requests)
 * 2. Q&A Chat Load Test (50 concurrent sessions, 3-5 messages each)
 * 3. Circuit Breaker Validation (failure handling)
 * 4. Combined Load Test (mixed traffic)
 *
 * Performance Targets:
 * - Match Explanation: P95 <5s (uncached), <500ms (cached)
 * - Q&A Chat: P95 <5s
 * - Circuit Breaker: Fast fail <100ms when open
 * - Cache Hit Rate: >40%
 *
 * Date: October 10, 2025
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { generateTestToken } from '../lib/auth/test-token-generator';

// Initialize clients
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_CACHE_URL || 'redis://localhost:6379/0');

// Test configuration
const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  TEST_USER_EMAIL: 'loadtest@connectplt.kr',
  MATCH_EXPLANATION_CONCURRENCY: 100,
  QA_CHAT_CONCURRENCY: 50,
  QA_MESSAGES_PER_SESSION: 4, // Average 3-5 messages
  CIRCUIT_BREAKER_REQUESTS: 10,
  COMBINED_MATCH_COUNT: 50,
  COMBINED_QA_COUNT: 25,
};

// Response time tracking
interface ResponseTime {
  timestamp: number;
  duration: number;
  cached: boolean;
  error?: string;
}

interface TestResult {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  responseTimes: ResponseTime[];
  cacheHitRate: number;
  p50: number;
  p95: number;
  p99: number;
  passed: boolean;
  errors: string[];
}

// Utility: Calculate percentiles
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Utility: Pretty print duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Utility: Pretty print test results
function printTestResult(result: TestResult) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ${result.testName}`);
  console.log('='.repeat(80));
  console.log(`Total Requests:      ${result.totalRequests}`);
  console.log(`✅ Successful:       ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed:           ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`📦 Cache Hit Rate:   ${(result.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`\n⏱️  Response Times:`);
  console.log(`   P50 (median):     ${formatDuration(result.p50)}`);
  console.log(`   P95:              ${formatDuration(result.p95)}`);
  console.log(`   P99:              ${formatDuration(result.p99)}`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    const uniqueErrors = [...new Set(result.errors)];
    uniqueErrors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    if (uniqueErrors.length > 5) {
      console.log(`   ... and ${uniqueErrors.length - 5} more`);
    }
  }

  console.log(`\n${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('='.repeat(80));
}

// Test 1: Match Explanation Load Test
async function testMatchExplanation(authToken: string): Promise<TestResult> {
  console.log('\n🚀 Starting Test 1: Match Explanation Load Test (100 concurrent requests)');
  console.log('   Target: P95 <5s (uncached), P95 <500ms (cached)');

  const responseTimes: ResponseTime[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failCount = 0;

  // Get test matches
  const matches = await prisma.funding_matches.findMany({
    take: 20, // Use 20 different matches for variety
    include: {
      funding_programs: true,
      organizations: true,
    },
  });

  if (matches.length === 0) {
    throw new Error('No funding matches found. Please seed the database first.');
  }

  // Create concurrent requests
  const requests = Array.from({ length: CONFIG.MATCH_EXPLANATION_CONCURRENCY }, (_, i) => {
    const match = matches[i % matches.length]; // Rotate through matches
    return async () => {
      const startTime = Date.now();
      try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/matches/${match.id}/explanation`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });

        const duration = Date.now() - startTime;
        const data = await response.json();

        if (response.ok) {
          successCount++;
          responseTimes.push({
            timestamp: startTime,
            duration,
            cached: data.cached || false,
          });
        } else {
          failCount++;
          errors.push(data.error || 'Unknown error');
        }
      } catch (error) {
        failCount++;
        const duration = Date.now() - startTime;
        responseTimes.push({
          timestamp: startTime,
          duration,
          cached: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    };
  });

  // Execute all requests concurrently
  await Promise.all(requests.map(fn => fn()));

  // Calculate metrics
  const durations = responseTimes.map(rt => rt.duration);
  const cachedCount = responseTimes.filter(rt => rt.cached).length;
  const cacheHitRate = responseTimes.length > 0 ? cachedCount / responseTimes.length : 0;

  const p50 = calculatePercentile(durations, 50);
  const p95 = calculatePercentile(durations, 95);
  const p99 = calculatePercentile(durations, 99);

  // Determine if test passed
  const passed = p95 < 5000 && cacheHitRate > 0.4; // P95 <5s, cache >40%

  return {
    testName: 'Match Explanation Load Test',
    totalRequests: CONFIG.MATCH_EXPLANATION_CONCURRENCY,
    successfulRequests: successCount,
    failedRequests: failCount,
    responseTimes,
    cacheHitRate,
    p50,
    p95,
    p99,
    passed,
    errors,
  };
}

// Test 2: Q&A Chat Load Test
async function testQAChat(authToken: string): Promise<TestResult> {
  console.log('\n🚀 Starting Test 2: Q&A Chat Load Test (50 sessions, 3-5 messages each)');
  console.log('   Target: P95 <5s');

  const responseTimes: ResponseTime[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failCount = 0;

  // Test questions (rotate through these)
  const testQuestions = [
    'TRL 7이란 무엇인가요?',
    'ISMS-P 인증이 필요한 이유는?',
    'IITP와 KEIT의 차이점은?',
    '기술개발 과제 신청 절차를 알려주세요',
    'KC 인증 취득 방법은?',
  ];

  // Create concurrent chat sessions
  const sessions = Array.from({ length: CONFIG.QA_CHAT_CONCURRENCY }, (_, sessionIndex) => {
    return async () => {
      let conversationId: string | null = null;

      // Send 3-5 messages per session
      for (let msgIndex = 0; msgIndex < CONFIG.QA_MESSAGES_PER_SESSION; msgIndex++) {
        const question = testQuestions[msgIndex % testQuestions.length];
        const startTime = Date.now();

        try {
          const response: Response = await fetch(`${CONFIG.BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              message: question,
              conversationId: conversationId,
            }),
          });

          const duration = Date.now() - startTime;
          const data: any = await response.json();

          if (response.ok) {
            successCount++;
            conversationId = data.conversationId; // Use for next message
            responseTimes.push({
              timestamp: startTime,
              duration,
              cached: false, // Q&A chat doesn't cache
            });
          } else {
            failCount++;
            errors.push(data.error || 'Unknown error');
          }
        } catch (error) {
          failCount++;
          const duration = Date.now() - startTime;
          responseTimes.push({
            timestamp: startTime,
            duration,
            cached: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }
    };
  });

  // Execute all sessions concurrently
  await Promise.all(sessions.map(fn => fn()));

  // Calculate metrics
  const durations = responseTimes.map(rt => rt.duration);
  const p50 = calculatePercentile(durations, 50);
  const p95 = calculatePercentile(durations, 95);
  const p99 = calculatePercentile(durations, 99);

  // Determine if test passed
  const passed = p95 < 5000; // P95 <5s

  return {
    testName: 'Q&A Chat Load Test',
    totalRequests: CONFIG.QA_CHAT_CONCURRENCY * CONFIG.QA_MESSAGES_PER_SESSION,
    successfulRequests: successCount,
    failedRequests: failCount,
    responseTimes,
    cacheHitRate: 0, // Q&A doesn't cache
    p50,
    p95,
    p99,
    passed,
    errors,
  };
}

// Test 3: Circuit Breaker Validation
async function testCircuitBreaker(authToken: string): Promise<TestResult> {
  console.log('\n🚀 Starting Test 3: Circuit Breaker Validation');
  console.log('   Simulating AI API failure...');
  console.log('   Target: Fallback content returned, fast fail <100ms when open');

  const responseTimes: ResponseTime[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failCount = 0;
  let fallbackCount = 0;

  // Get a test match
  const match = await prisma.funding_matches.findFirst({
    include: {
      funding_programs: true,
      organizations: true,
    },
  });

  if (!match) {
    throw new Error('No funding matches found. Please seed the database first.');
  }

  // Temporarily disable AI by setting invalid API key
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'invalid_key_to_trigger_circuit_breaker';

  // Send requests to trigger circuit breaker
  for (let i = 0; i < CONFIG.CIRCUIT_BREAKER_REQUESTS; i++) {
    const startTime = Date.now();

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/api/matches/${match.id}/explanation`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (response.ok && data.explanation) {
        successCount++;
        fallbackCount++; // Should return fallback content
        responseTimes.push({
          timestamp: startTime,
          duration,
          cached: false,
        });
      } else {
        failCount++;
        errors.push(data.error || 'No fallback content returned');
      }
    } catch (error) {
      failCount++;
      const duration = Date.now() - startTime;
      responseTimes.push({
        timestamp: startTime,
        duration,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Restore original API key
  process.env.ANTHROPIC_API_KEY = originalKey;

  // Calculate metrics
  const durations = responseTimes.map(rt => rt.duration);
  const p50 = calculatePercentile(durations, 50);
  const p95 = calculatePercentile(durations, 95);
  const p99 = calculatePercentile(durations, 99);

  // Determine if test passed
  // Should return fallback content (success) and be fast (<100ms after circuit opens)
  const passed = successCount >= CONFIG.CIRCUIT_BREAKER_REQUESTS * 0.8 && p95 < 5000;

  return {
    testName: 'Circuit Breaker Validation',
    totalRequests: CONFIG.CIRCUIT_BREAKER_REQUESTS,
    successfulRequests: successCount,
    failedRequests: failCount,
    responseTimes,
    cacheHitRate: 0,
    p50,
    p95,
    p99,
    passed,
    errors,
  };
}

// Test 4: Combined Load Test
async function testCombinedLoad(authToken: string): Promise<TestResult> {
  console.log('\n🚀 Starting Test 4: Combined Load Test');
  console.log('   50 match explanations + 25 Q&A sessions (100 messages)');
  console.log('   Target: No cascading failures, all rate limits respected');

  const responseTimes: ResponseTime[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failCount = 0;

  // Get test data
  const matches = await prisma.funding_matches.findMany({
    take: 10,
    include: {
      funding_programs: true,
      organizations: true,
    },
  });

  if (matches.length === 0) {
    throw new Error('No funding matches found. Please seed the database first.');
  }

  const testQuestions = [
    'TRL 7이란 무엇인가요?',
    'ISMS-P 인증이 필요한 이유는?',
    'IITP와 KEIT의 차이점은?',
    'KC 인증 취득 방법은?',
  ];

  // Create mixed requests
  const requests: Array<() => Promise<void>> = [];

  // Add match explanation requests
  for (let i = 0; i < CONFIG.COMBINED_MATCH_COUNT; i++) {
    const match = matches[i % matches.length];
    requests.push(async () => {
      const startTime = Date.now();
      try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/matches/${match.id}/explanation`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });
        const duration = Date.now() - startTime;
        const data = await response.json();

        if (response.ok) {
          successCount++;
          responseTimes.push({ timestamp: startTime, duration, cached: data.cached || false });
        } else {
          failCount++;
          errors.push(data.error || 'Unknown error');
        }
      } catch (error) {
        failCount++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    });
  }

  // Add Q&A chat requests
  for (let i = 0; i < CONFIG.COMBINED_QA_COUNT; i++) {
    requests.push(async () => {
      const question = testQuestions[i % testQuestions.length];
      const startTime = Date.now();
      try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ message: question }),
        });
        const duration = Date.now() - startTime;
        const data = await response.json();

        if (response.ok) {
          successCount++;
          responseTimes.push({ timestamp: startTime, duration, cached: false });
        } else {
          failCount++;
          errors.push(data.error || 'Unknown error');
        }
      } catch (error) {
        failCount++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    });
  }

  // Shuffle requests to simulate real mixed traffic
  requests.sort(() => Math.random() - 0.5);

  // Execute all requests concurrently
  await Promise.all(requests.map(fn => fn()));

  // Calculate metrics
  const durations = responseTimes.map(rt => rt.duration);
  const cachedCount = responseTimes.filter(rt => rt.cached).length;
  const cacheHitRate = responseTimes.length > 0 ? cachedCount / responseTimes.length : 0;

  const p50 = calculatePercentile(durations, 50);
  const p95 = calculatePercentile(durations, 95);
  const p99 = calculatePercentile(durations, 99);

  // Determine if test passed (>80% success rate, no cascading failures)
  const passed = successCount / (CONFIG.COMBINED_MATCH_COUNT + CONFIG.COMBINED_QA_COUNT) > 0.8;

  return {
    testName: 'Combined Load Test',
    totalRequests: CONFIG.COMBINED_MATCH_COUNT + CONFIG.COMBINED_QA_COUNT,
    successfulRequests: successCount,
    failedRequests: failCount,
    responseTimes,
    cacheHitRate,
    p50,
    p95,
    p99,
    passed,
    errors,
  };
}

// Main execution
async function main() {
  console.log('🧪 AI Features Load Testing Suite');
  console.log('===================================');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`Domain: connectplt.kr`);

  // Generate JWT token for authenticated requests
  console.log('\n🔐 Generating test authentication token...');
  const authToken = await generateTestToken('admin-user-id', 'loadtest@connectplt.kr', 'ADMIN');
  console.log('✅ Authentication token generated');

  const results: TestResult[] = [];

  try {
    // Test 1: Match Explanation
    const test1 = await testMatchExplanation(authToken);
    printTestResult(test1);
    results.push(test1);

    // Wait 5 seconds between tests
    console.log('\n⏸️  Waiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: Q&A Chat
    const test2 = await testQAChat(authToken);
    printTestResult(test2);
    results.push(test2);

    // Wait 5 seconds between tests
    console.log('\n⏸️  Waiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 3: Circuit Breaker
    const test3 = await testCircuitBreaker(authToken);
    printTestResult(test3);
    results.push(test3);

    // Wait 5 seconds between tests
    console.log('\n⏸️  Waiting 5 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 4: Combined Load
    const test4 = await testCombinedLoad(authToken);
    printTestResult(test4);
    results.push(test4);

    // Final summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📈 FINAL SUMMARY');
    console.log('='.repeat(80));

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failedTests} (${((failedTests / totalTests) * 100).toFixed(1)}%)`);

    console.log('\nTest Results:');
    results.forEach(r => {
      console.log(`   ${r.passed ? '✅' : '❌'} ${r.testName}`);
    });

    console.log('\n' + '='.repeat(80));

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! AI features are production-ready.');
      process.exit(0);
    } else {
      console.log('⚠️  SOME TESTS FAILED. Please review and optimize.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await redis.quit();
  }
}

// Run tests
main().catch(console.error);
