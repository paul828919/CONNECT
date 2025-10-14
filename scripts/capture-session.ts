/**
 * Manual Browser Session Capture for E2E Tests
 *
 * This script opens a browser where you can manually log in to production,
 * then captures your authentication session for automated tests.
 */

import { chromium } from '@playwright/test';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '..', '.playwright', 'paul-auth.json');

async function captureSession() {
  console.log('\n📋 Manual Session Capture for E2E Tests');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('1️⃣  Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('2️⃣  Opening production site...');
  await page.goto('https://connectplt.kr');

  console.log('\n📝 INSTRUCTIONS:');
  console.log('   1. The browser window should now be open');
  console.log('   2. Click "카카오로 시작하기" (Kakao Sign In)');
  console.log('   3. Complete the Kakao login process');
  console.log('   4. Wait until you see the dashboard or homepage (logged in)');
  console.log('   5. Press ENTER in this terminal when you\'re logged in\n');

  // Wait for user to press Enter
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise<void>((resolve) => {
    rl.question('Press ENTER when you are logged in: ', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\n3️⃣  Capturing session...');

  // Create .playwright directory if it doesn't exist
  const playwrightDir = path.dirname(authFile);
  if (!fs.existsSync(playwrightDir)) {
    fs.mkdirSync(playwrightDir, { recursive: true });
  }

  await context.storageState({ path: authFile });

  console.log(`   ✓ Saved to: ${authFile}`);

  // Verify the session was captured
  const sessionData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  const hasCookies = sessionData.cookies && sessionData.cookies.length > 0;

  console.log(`   ✓ Captured ${sessionData.cookies?.length || 0} cookies`);
  console.log(`   ✓ Session valid: ${hasCookies ? 'YES' : 'NO'}\n`);

  console.log('✅ Session captured successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Next steps:');
  console.log('   1. Run: npm run test:e2e:auth-verify');
  console.log('   2. Run: npm run test:e2e:prod\n');

  await browser.close();
  process.exit(0);
}

captureSession().catch((error) => {
  console.error('\n❌ Error capturing session:', error);
  process.exit(1);
});
