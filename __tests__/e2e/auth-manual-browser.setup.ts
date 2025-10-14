/**
 * Manual Browser Session Capture
 * Instructions:
 * 1. Open https://connectplt.kr in Chrome
 * 2. Log in manually (if not already logged in)
 * 3. Open DevTools > Application > Cookies
 * 4. Run this script to capture the session
 */

import { test as setup } from '@playwright/test';
import { chromium } from '@playwright/test';

const authFile = '.playwright/paul-auth.json';

setup('capture existing session', async () => {
  console.log('\n📋 Manual Session Capture');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('1️⃣  Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('2️⃣  Opening production site...');
  await page.goto('https://connectplt.kr');
  
  console.log('\n📝 INSTRUCTIONS:');
  console.log('   1. If not logged in, click "카카오로 시작하기" and log in');
  console.log('   2. Wait until you see the homepage or dashboard');
  console.log('   3. Press ENTER in this terminal when ready\n');
  
  // Wait for user to press Enter
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });
  
  console.log('\n3️⃣  Capturing session...');
  await context.storageState({ path: authFile });
  
  console.log(`   ✓ Saved to: ${authFile}\n`);
  console.log('✅ Session captured successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await browser.close();
});
