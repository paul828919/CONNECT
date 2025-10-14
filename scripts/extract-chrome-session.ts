/**
 * Extract session from your existing Chrome browser
 * This uses your REAL Chrome profile where you're already logged in
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

const authFile = path.join(__dirname, '..', '.playwright', 'paul-auth.json');

async function extractChromeSession() {
  console.log('\n📋 Extract Session from Chrome Browser');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Detect Chrome user data directory based on OS
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const chromeUserDataDir = path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome');

  console.log('1️⃣  Launching Chrome with your existing profile...');
  console.log(`   Profile path: ${chromeUserDataDir}\n`);

  const browser = await chromium.launchPersistentContext(chromeUserDataDir, {
    headless: false,
    channel: 'chrome', // Use your actual Chrome browser
    args: [
      '--no-first-run',
      '--no-default-browser-check',
    ]
  });

  const page = await browser.newPage();

  console.log('2️⃣  Opening production site...');
  await page.goto('https://connectplt.kr/dashboard');

  console.log('\n📝 INSTRUCTIONS:');
  console.log('   1. Chrome should open with your existing session');
  console.log('   2. If you see the dashboard (logged in), great!');
  console.log('   3. If not logged in, click "카카오로 시작하기" and log in');
  console.log('   4. Press ENTER in this terminal when you see the dashboard\n');

  // Wait for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise<void>((resolve) => {
    rl.question('Press ENTER when you are on the dashboard: ', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\n3️⃣  Extracting session...');

  // Create .playwright directory if it doesn't exist
  const playwrightDir = path.dirname(authFile);
  if (!fs.existsSync(playwrightDir)) {
    fs.mkdirSync(playwrightDir, { recursive: true });
  }

  // Get all cookies and storage
  const cookies = await browser.cookies();
  const storageState = await browser.storageState();

  // Save to auth file
  fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));

  console.log(`   ✓ Saved to: ${authFile}`);
  console.log(`   ✓ Captured ${cookies.length} cookies`);
  console.log(`   ✓ Session valid: ${cookies.length > 0 ? 'YES' : 'NO'}\n`);

  console.log('✅ Session extracted successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Next steps:');
  console.log('   1. Run: npm run test:e2e:auth-verify');
  console.log('   2. Run: PLAYWRIGHT_BASE_URL=https://connectplt.kr npm run test:e2e:prod\n');

  await browser.close();
  process.exit(0);
}

extractChromeSession().catch((error) => {
  console.error('\n❌ Error extracting session:', error);
  console.log('\nTroubleshooting:');
  console.log('   • Make sure Chrome is closed before running this script');
  console.log('   • Make sure you are logged in to https://connectplt.kr in Chrome');
  process.exit(1);
});
