/**
 * Debug script to take screenshot of Hancom Docs dashboard
 * after successful OAuth login
 */

import { chromium } from 'playwright';

async function debugDashboard() {
  console.log('=== Debugging Hancom Docs Dashboard ===\n');

  const loginUrl = process.env.HANCOM_DOCS_URL || 'https://www.hancomdocs.com/ko/';
  const email = process.env.HANCOM_DOCS_ID;
  const password = process.env.HANCOM_DOCS_PW;

  if (!email || !password) {
    throw new Error('Missing credentials');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // Login flow
    console.log('1. Accessing homepage...');
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('2. Clicking login button...');
    await page.click('button:has-text("로그인"), a:has-text("로그인")');
    await page.waitForURL('**/oauth2/authorize**', { timeout: 15000 });

    console.log('3. Filling OAuth form...');
    await page.waitForSelector('input[type="text"], input[type="email"], input[name="userId"]', {
      timeout: 10000,
    });
    await page.fill('input[type="text"], input[type="email"], input[name="userId"]', email);
    await page.fill('input[type="password"]', password);

    console.log('4. Submitting login...');
    await page.click('button:has-text("로그인"), button[type="submit"]');
    await page.waitForURL('**/ko/home**', { timeout: 20000 });

    console.log('5. Dashboard loaded\n');

    // Take screenshot
    await page.screenshot({
      path: '/tmp/hancom-dashboard.png',
      fullPage: true,
    });
    console.log('✓ Screenshot saved: /tmp/hancom-dashboard.png');

    // Get page HTML
    const html = await page.content();
    const htmlPath = '/tmp/hancom-dashboard.html';
    require('fs').writeFileSync(htmlPath, html);
    console.log(`✓ HTML saved: ${htmlPath}`);

    // Find all elements with "업로드" text
    console.log('\n=== Elements containing "업로드" ===');
    const uploadElements = await page.locator('text=/업로드/i').all();
    console.log(`Found ${uploadElements.length} elements`);

    for (let i = 0; i < uploadElements.length; i++) {
      const el = uploadElements[i];
      const text = await el.textContent();
      const tagName = await el.evaluate(node => node.tagName);
      const role = await el.getAttribute('role');
      const ariaLabel = await el.getAttribute('aria-label');

      console.log(`\n[${i + 1}]:`);
      console.log(`  Tag: ${tagName}`);
      console.log(`  Text: ${text?.trim()}`);
      console.log(`  Role: ${role || 'N/A'}`);
      console.log(`  Aria-label: ${ariaLabel || 'N/A'}`);
    }

    // Find all buttons
    console.log('\n\n=== All Buttons on Page ===');
    const buttons = await page.locator('button, [role="button"]').all();
    console.log(`Found ${buttons.length} buttons\n`);

    for (let i = 0; i < Math.min(buttons.length, 20); i++) {
      const btn = buttons[i];
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');

      if (text || ariaLabel || title) {
        console.log(`[${i + 1}]:`);
        console.log(`  Text: ${text?.trim() || 'N/A'}`);
        console.log(`  Aria-label: ${ariaLabel || 'N/A'}`);
        console.log(`  Title: ${title || 'N/A'}`);
        console.log('');
      }
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugDashboard()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
