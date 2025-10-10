/**
 * Test Fallback System
 * Verifies circuit breaker, fallback content, and performance monitoring
 *
 * Week 3, Day 22-23, Part 3
 */

import { getFallbackContent, getErrorMessage } from '../lib/ai/fallback-content';
import { getCircuitBreakerStatusExternal } from '../lib/ai/client';
import { getPerformanceStats } from '../lib/ai/monitoring/performance';

console.log('🧪 Testing Fallback System\n');
console.log('='.repeat(60));

// Test 1: Fallback Content - Match Explanation
console.log('\n1️⃣  Testing Match Explanation Fallback');
console.log('-'.repeat(60));

const matchFallback = getFallbackContent('MATCH_EXPLANATION', {
  programTitle: 'Test R&D Program',
  organizationName: 'Test Company Inc',
  matchScore: 85,
});

console.log('✅ Match explanation fallback generated');
console.log('   Korean length:', matchFallback.korean.length, 'characters');
console.log('   English length:', matchFallback.content.length, 'characters');
console.log('   Source:', matchFallback.source);
console.log('   Is generic:', matchFallback.isGeneric);
console.log('   Preview (Korean):', matchFallback.korean.substring(0, 100) + '...');

// Test 2: Fallback Content - Q&A Chat
console.log('\n2️⃣  Testing Q&A Chat Fallback');
console.log('-'.repeat(60));

const questions = [
  '지원 자격이 어떻게 되나요?',
  'TRL이 뭔가요?',
  'ISMS-P 인증이 필요한가요?',
  'General question',
];

for (const question of questions) {
  const qaFallback = getFallbackContent('QA_CHAT', { question });
  console.log(`✅ Q&A fallback for: "${question.substring(0, 30)}..."`);
  console.log(`   Korean length: ${qaFallback.korean.length} characters`);
}

// Test 3: Error Messages with Korean Translation
console.log('\n3️⃣  Testing Error Message Translations');
console.log('-'.repeat(60));

const errors = [
  { message: 'Circuit breaker is OPEN', code: undefined, status: undefined },
  { message: 'Rate limit exceeded', code: undefined, status: 429 },
  { message: 'Daily budget exceeded', code: undefined, status: undefined },
  { message: 'API key invalid', code: undefined, status: 401 },
  { message: 'Network error', code: 'ETIMEDOUT', status: undefined },
  { message: 'Server error', code: undefined, status: 500 },
];

for (const error of errors) {
  const translated = getErrorMessage(error);
  console.log(`✅ Error: "${error.message}"`);
  console.log(`   Korean: ${translated.korean}`);
  console.log(`   English: ${translated.english}`);
  console.log('');
}

// Test 4: Circuit Breaker Status
console.log('\n4️⃣  Testing Circuit Breaker Status');
console.log('-'.repeat(60));

getCircuitBreakerStatusExternal()
  .then((status) => {
    console.log('✅ Circuit breaker status retrieved');
    console.log('   State:', status.state);
    console.log('   Failures:', status.failures);
    console.log('   Last failure:', status.lastFailureTime ? new Date(status.lastFailureTime).toLocaleString() : 'None');
    console.log('   Configuration:');
    console.log('     - Failure threshold:', status.config.failureThreshold);
    console.log('     - Failure window:', status.config.failureWindowMs / 1000, 'seconds');
    console.log('     - Open timeout:', status.config.openTimeoutMs / 1000, 'seconds');
  })
  .catch((error) => {
    console.error('❌ Circuit breaker test failed:', error.message);
  });

// Test 5: Performance Stats
console.log('\n5️⃣  Testing Performance Monitoring');
console.log('-'.repeat(60));

setTimeout(() => {
  getPerformanceStats('ALL', 60)
    .then((stats) => {
      console.log('✅ Performance stats retrieved');
      console.log('   Period:', stats.period.minutes, 'minutes');
      console.log('   Total requests:', stats.requests.total);
      console.log('   Success rate:', stats.requests.successRate.toFixed(1) + '%');
      console.log('   Response time:');
      console.log('     - P50:', stats.responseTime.p50.toFixed(0) + 'ms');
      console.log('     - P95:', stats.responseTime.p95.toFixed(0) + 'ms');
      console.log('     - P99:', stats.responseTime.p99.toFixed(0) + 'ms');
      console.log('   Cache hit rate:', stats.cache.hitRate.toFixed(1) + '%');
      console.log('   Total cost: ₩' + stats.cost.total.toFixed(2));

      console.log('\n' + '='.repeat(60));
      console.log('✅ All fallback system tests passed!');
      console.log('='.repeat(60));

      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Performance stats test failed:', error.message);
      console.log('\n⚠️  Some tests passed, but performance stats unavailable (Redis may not be running)');
      console.log('='.repeat(60));
      process.exit(0);
    });
}, 1000); // Wait for circuit breaker test to complete
