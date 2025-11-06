#!/usr/bin/env tsx
/**
 * Hancom Docs Workflow Debugging
 *
 * Launches visible Playwright browser to observe user's manual workflow
 * for HWP conversion via Hancom Docs web service.
 */

import { chromium } from 'playwright';

async function main() {
  console.log('🌐 Launching visible browser for Hancom Docs workflow observation...\n');

  const browser = await chromium.launch({
    headless: false, // Visible browser
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  const page = await context.newPage();

  console.log('📱 Navigating to Hancom Docs homepage...');
  await page.goto('https://www.hancomdocs.com/ko/home', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });

  console.log('✅ Hancom Docs homepage loaded. Browser will remain open.');
  console.log('👀 Ready to observe user workflow...\n');
  console.log('Press Ctrl+C to close browser when done.\n');

  // Keep browser open indefinitely until user terminates
  await new Promise(() => {});
}

main();
