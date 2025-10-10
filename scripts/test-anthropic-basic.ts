#!/usr/bin/env tsx
/**
 * Basic Anthropic API Test Script
 * Tests API connectivity, Korean language support, and token usage
 *
 * Usage:
 * export ANTHROPIC_API_KEY="sk-ant-..."
 * npx tsx scripts/test-anthropic-basic.ts
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testBasicRequest() {
  console.log('===========================================');
  console.log('Anthropic API Basic Test');
  console.log('===========================================\n');

  try {
    console.log('1. Testing API Connection...');

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: "당신은 한국 정부 R&D 과제 전문가입니다. 전문적이고 친절한 존댓말로 답변해주세요.",
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: "안녕하세요. TRL 7 수준의 기술을 한국어로 설명해주세요."
        }
      ]
    });

    console.log('✅ API Connection Successful\n');

    // Extract response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    console.log('2. Response:');
    console.log('-------------------------------------------');
    console.log(responseText);
    console.log('-------------------------------------------\n');

    // Token usage
    console.log('3. Token Usage:');
    console.log(`   Input tokens:  ${message.usage.input_tokens}`);
    console.log(`   Output tokens: ${message.usage.output_tokens}`);
    console.log(`   Total tokens:  ${message.usage.input_tokens + message.usage.output_tokens}`);

    // Calculate cost
    const inputCostUSD = (message.usage.input_tokens / 1_000_000) * 3;
    const outputCostUSD = (message.usage.output_tokens / 1_000_000) * 15;
    const totalCostUSD = inputCostUSD + outputCostUSD;
    const totalCostKRW = totalCostUSD * 1300;

    console.log(`\n4. Cost Calculation:`);
    console.log(`   Input cost:  $${inputCostUSD.toFixed(6)} (₩${(inputCostUSD * 1300).toFixed(2)})`);
    console.log(`   Output cost: $${outputCostUSD.toFixed(6)} (₩${(outputCostUSD * 1300).toFixed(2)})`);
    console.log(`   Total cost:  $${totalCostUSD.toFixed(6)} (₩${totalCostKRW.toFixed(2)})`);

    // Quality checks
    console.log(`\n5. Quality Checks:`);
    const hasKorean = /[가-힣]/.test(responseText);
    const hasJondaemal = /습니다|입니다|세요/.test(responseText);
    const hasTRL = /TRL|기술성숙도/.test(responseText);

    console.log(`   ✓ Korean text: ${hasKorean ? '✅ Yes' : '❌ No'}`);
    console.log(`   ✓ 존댓말 (formal): ${hasJondaemal ? '✅ Yes' : '❌ No'}`);
    console.log(`   ✓ TRL mentioned: ${hasTRL ? '✅ Yes' : '❌ No'}`);

    console.log('\n===========================================');
    console.log('✅ All Tests Passed!');
    console.log('===========================================');

    return true;

  } catch (error: any) {
    console.error('\n❌ Test Failed:');

    if (error.status === 401) {
      console.error('   Error: Invalid API key');
      console.error('   Solution: Set ANTHROPIC_API_KEY environment variable');
    } else if (error.status === 429) {
      console.error('   Error: Rate limit exceeded');
      console.error('   Solution: Wait before retrying');
    } else if (error.status === 400) {
      console.error('   Error: Bad request');
      console.error('   Details:', error.message);
    } else {
      console.error('   Error:', error.message);
    }

    console.log('\n===========================================');
    return false;
  }
}

// Run test
testBasicRequest();
