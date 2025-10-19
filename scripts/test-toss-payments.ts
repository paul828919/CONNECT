/**
 * Toss Payments Local Test Script
 *
 * Tests payment endpoints in TOSS_TEST_MODE
 *
 * Usage:
 * ```bash
 * TOSS_TEST_MODE=true npx tsx scripts/test-toss-payments.ts
 * ```
 *
 * Requirements:
 * - Next.js dev server running on http://localhost:3000
 * - TOSS_TEST_MODE=true in .env.local
 * - Valid NextAuth session (use browser cookies or auth token)
 */

// Make this file a module to avoid global scope conflicts
export {};

console.log('🧪 Toss Payments Local Test Mode\n');

const BASE_URL = 'http://localhost:3000';

// Test 1: Checkout API
async function testCheckout() {
  console.log('1️⃣ Testing /api/payments/checkout...');

  const testCases = [
    { plan: 'PRO', billingCycle: 'monthly' },
    { plan: 'TEAM', billingCycle: 'yearly' },
  ];

  for (const testCase of testCases) {
    try {
      const response = await fetch(`${BASE_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication token or session cookie
        },
        body: JSON.stringify(testCase),
      });

      const data = await response.json();

      if (data.mode === 'TEST' && data.success) {
        console.log(`   ✅ ${testCase.plan} ${testCase.billingCycle}:`);
        console.log(`      Order ID: ${data.orderId}`);
        console.log(`      Amount: ₩${data.amount.toLocaleString()}`);
        console.log(`      Checkout URL: ${data.checkoutUrl}\n`);
      } else {
        console.log(`   ⚠️ ${testCase.plan} ${testCase.billingCycle}: ${data.error}\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }
}

// Test 2: Webhook API
async function testWebhook() {
  console.log('2️⃣ Testing /api/webhooks/toss...');

  const testEvents = [
    {
      type: 'payment.success',
      orderId: 'test_order_12345',
      amount: 490000,
      plan: 'PRO',
    },
    {
      type: 'payment.failed',
      orderId: 'test_order_67890',
      amount: 990000,
      plan: 'TEAM',
      reason: 'Insufficient funds',
    },
  ];

  for (const event of testEvents) {
    try {
      const response = await fetch(`${BASE_URL}/api/webhooks/toss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      const data = await response.json();

      if (data.mode === 'TEST' && data.success) {
        console.log(`   ✅ ${event.type}:`);
        console.log(`      Order ID: ${event.orderId}`);
        console.log(`      Amount: ₩${event.amount.toLocaleString()}\n`);
      } else {
        console.log(`   ⚠️ ${event.type}: ${data.error || 'Unknown error'}\n`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }
}

// Run tests
async function main() {
  console.log('⚙️ Environment Check:');
  console.log(`   TOSS_TEST_MODE: ${process.env.TOSS_TEST_MODE || 'not set'}`);
  console.log(`   BASE_URL: ${BASE_URL}\n`);

  if (process.env.TOSS_TEST_MODE !== 'true') {
    console.warn('⚠️ Warning: TOSS_TEST_MODE is not set to "true"');
    console.warn('   Set TOSS_TEST_MODE=true in .env.local for local testing\n');
  }

  console.log('🚀 Starting tests...\n');

  await testCheckout();
  await testWebhook();

  console.log('✅ Test suite completed!\n');
  console.log('📝 Notes:');
  console.log('   - Test mode skips actual Toss API calls');
  console.log('   - Checkout returns mock checkout URLs');
  console.log('   - Webhooks are logged but not processed');
  console.log('   - Database updates are NOT performed in test mode');
}

main().catch(console.error);
