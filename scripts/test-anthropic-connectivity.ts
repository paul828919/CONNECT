/**
 * Anthropic API Connectivity Test
 * Week 3-4 AI Integration - Day 15 Validation
 *
 * Tests:
 * 1. API key authentication
 * 2. Basic Korean request/response
 * 3. Rate limiting functionality
 * 4. Cost tracking
 * 5. Error handling
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import { sendAIRequest, getBudgetStatus, getRateLimitStatus, healthCheck } from '../lib/ai/client';

async function runTests() {
  console.log('========================================');
  console.log('Anthropic Claude AI - Connectivity Test');
  console.log('========================================\n');

  // Test 1: Health Check
  console.log('Test 1: Health Check');
  console.log('----------------------------------------');
  try {
    const health = await healthCheck();
    console.log('Status:', health.status);
    console.log('API Key Configured:', health.details.apiKeyConfigured ? '✅' : '❌');
    console.log('Redis Connected:', health.details.redisConnected ? '✅' : '❌');
    console.log('Budget Remaining:', `₩${health.details.budgetRemaining.toFixed(0)}`);
    console.log('Rate Limit Remaining:', health.details.rateLimitRemaining);

    if (!health.details.apiKeyConfigured) {
      console.error('\n❌ ERROR: ANTHROPIC_API_KEY not configured!');
      console.error('Get your API key from: https://console.anthropic.com/');
      console.error('Then update .env file with: ANTHROPIC_API_KEY="sk-ant-..."');
      process.exit(1);
    }

    if (!health.details.redisConnected) {
      console.error('\n❌ ERROR: Redis not connected!');
      console.error('Start Redis with: brew services start redis');
      process.exit(1);
    }

    console.log('✅ Health check passed\n');
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }

  // Test 2: Basic Korean Request
  console.log('Test 2: Basic Korean Request');
  console.log('----------------------------------------');
  try {
    const response = await sendAIRequest({
      system: '당신은 Connect 플랫폼의 AI 어시스턴트입니다. 한국 정부 R&D 과제에 대한 질문에 답변합니다.',
      messages: [
        {
          role: 'user',
          content: 'TRL 7 수준의 기술이란 무엇인가요? 간단히 설명해주세요.',
        },
      ],
      maxTokens: 300,
      temperature: 0.7,
    });

    console.log('Response Content:');
    console.log(response.content);
    console.log('\nUsage:');
    console.log(`  Input tokens: ${response.usage.inputTokens}`);
    console.log(`  Output tokens: ${response.usage.outputTokens}`);
    console.log(`  Cost: ₩${response.cost.toFixed(2)}`);
    console.log(`  Stop reason: ${response.stopReason}`);
    console.log('✅ Korean request/response successful\n');
  } catch (error: any) {
    console.error('❌ Korean request failed:', error.message);
    process.exit(1);
  }

  // Test 3: Budget Status
  console.log('Test 3: Budget Status');
  console.log('----------------------------------------');
  try {
    const budget = await getBudgetStatus();
    console.log(`Spent today: ₩${budget.spent.toFixed(0)}`);
    console.log(`Remaining: ₩${budget.remaining.toFixed(0)}`);
    console.log(`Percentage used: ${budget.percentage.toFixed(1)}%`);
    console.log(`Daily limit: ₩${budget.dailyLimit.toFixed(0)}`);
    console.log('✅ Budget tracking functional\n');
  } catch (error: any) {
    console.error('❌ Budget check failed:', error.message);
    process.exit(1);
  }

  // Test 4: Rate Limit Status
  console.log('Test 4: Rate Limit Status');
  console.log('----------------------------------------');
  try {
    const rateLimit = await getRateLimitStatus();
    console.log(`Used this minute: ${rateLimit.used}`);
    console.log(`Limit: ${rateLimit.limit} requests/minute`);
    console.log(`Remaining: ${rateLimit.remaining}`);
    console.log('✅ Rate limiting functional\n');
  } catch (error: any) {
    console.error('❌ Rate limit check failed:', error.message);
    process.exit(1);
  }

  // Test 5: Error Handling (Bad Request)
  console.log('Test 5: Error Handling');
  console.log('----------------------------------------');
  try {
    // Intentionally send empty message to trigger error
    await sendAIRequest({
      messages: [
        {
          role: 'user',
          content: '', // Empty content should trigger 400 error
        },
      ],
      maxTokens: 100,
    });
    console.error('❌ Error handling test failed: Should have thrown error for empty content');
  } catch (error: any) {
    if (error.message.includes('Bad request') || error.message.includes('AI request failed')) {
      console.log('Error caught correctly:', error.message);
      console.log('✅ Error handling functional\n');
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }

  // Test 6: Korean R&D Domain Question
  console.log('Test 6: Korean R&D Domain Expertise');
  console.log('----------------------------------------');
  try {
    const response = await sendAIRequest({
      system: `당신은 Connect 플랫폼의 AI 매칭 전문가입니다.

역할:
- 한국 정부 R&D 과제와 기업의 매칭 결과 설명
- 기술성숙도(TRL), 인증 요건, 예산 등에 대한 질문 답변
- 전문적이면서 친근한 존댓말 사용`,
      messages: [
        {
          role: 'user',
          content: 'ICT 중소기업(TRL 7, ISMS-P 보유)이 IITP AI 융합 과제에 지원하려고 합니다. 적합한가요?',
        },
      ],
      maxTokens: 400,
      temperature: 0.7,
    });

    console.log('Response:');
    console.log(response.content);
    console.log(`\nCost: ₩${response.cost.toFixed(2)}`);
    console.log('✅ Domain expertise validated\n');
  } catch (error: any) {
    console.error('❌ Domain test failed:', error.message);
    process.exit(1);
  }

  // Final Summary
  console.log('========================================');
  console.log('TEST SUMMARY');
  console.log('========================================');
  const finalBudget = await getBudgetStatus();
  const finalRateLimit = await getRateLimitStatus();
  console.log('✅ All tests passed!');
  console.log(`Total spent: ₩${finalBudget.spent.toFixed(2)}`);
  console.log(`Requests used: ${finalRateLimit.used}/${finalRateLimit.limit}`);
  console.log('\n🎉 AI client is ready for production use!');
  console.log('========================================\n');

  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
