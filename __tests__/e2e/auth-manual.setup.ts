/**
 * Manual Authentication Setup for Paul Kim's Admin Account
 * Run once with: npm run test:e2e:auth-setup
 */

import { test as setup, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const authFile = '.playwright/paul-auth.json';

setup('authenticate as Paul Kim', async ({ page }) => {
  console.log('\n🔐 Manual Authentication Setup for Paul Kim');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1️⃣  Opening sign-in page...');
  await page.goto(`${BASE_URL}/auth/signin`);

  console.log('2️⃣  Please complete OAuth login:');
  console.log('   • Click "카카오로 시작하기" or "네이버로 시작하기"');
  console.log('   • Authorize the application');
  console.log('   • Wait for redirect to dashboard...\n');

  // Wait for dashboard (indicates successful auth)
  await page.waitForURL(/\/dashboard/, { timeout: 180000 }); // 3 minutes

  console.log('✅ OAuth login successful!\n');

  // Verify session
  console.log('3️⃣  Verifying session...');
  await page.goto(`${BASE_URL}/api/auth/session`);
  const sessionText = await page.textContent('body');
  const session = JSON.parse(sessionText || '{}');

  expect(session.user).toBeDefined();
  expect(session.user?.email).toBeTruthy();

  console.log(`   ✓ Name: ${session.user?.name || 'N/A'}`);
  console.log(`   ✓ Email: ${session.user?.email || 'N/A'}`);
  console.log(`   ✓ Organization: ${session.user?.organizationId || 'Not created yet'}`);

  // Save authentication state
  console.log('\n4️⃣  Saving authentication state...');
  await page.context().storageState({ path: authFile });

  console.log(`   ✓ Saved to: ${authFile}`);
  console.log('\n✅ Setup complete! All future tests will reuse this session.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
