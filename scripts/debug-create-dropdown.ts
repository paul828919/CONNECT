/**
 * Debug script to click "새 문서 만들기" dropdown
 * and see what options appear
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

async function debugCreateDropdown() {
  console.log('=== Debugging Create Document Dropdown ===\n');

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
    acceptDownloads: true,
  });

  const page = await context.newPage();

  try {
    // Login flow
    console.log('1. Logging in...');
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("로그인"), a:has-text("로그인")');
    await page.waitForURL('**/oauth2/authorize**', { timeout: 15000 });
    await page.fill('input[type="text"], input[type="email"], input[name="userId"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("로그인"), button[type="submit"]');
    await page.waitForURL('**/ko/home**', { timeout: 20000 });
    console.log('✓ Logged in\n');

    // Take screenshot before clicking
    await page.screenshot({
      path: '/tmp/before-dropdown-click.png',
      fullPage: false,
    });
    console.log('✓ Screenshot 1: /tmp/before-dropdown-click.png');

    // Click "새 문서 만들기" button to open dropdown
    console.log('\n2. Clicking "새 문서 만들기" dropdown...');
    await page.click('button:has-text("새 문서 만들기")');
    await page.waitForTimeout(1000); // Wait for dropdown to appear

    // Take screenshot after clicking
    await page.screenshot({
      path: '/tmp/after-dropdown-click.png',
      fullPage: false,
    });
    console.log('✓ Screenshot 2: /tmp/after-dropdown-click.png');

    // Find all menu items
    console.log('\n3. Finding menu items...');
    const menuItems = await page.locator('[role="menu"], [role="menuitem"], div[class*="menu"]').all();
    console.log(`Found ${menuItems.length} menu elements`);

    // Find all elements with "업로드" after clicking
    const uploadElements = await page.locator('text=/업로드/i').all();
    console.log(`\nFound ${uploadElements.length} elements with "업로드":\n`);

    for (let i = 0; i < uploadElements.length; i++) {
      const el = uploadElements[i];
      const text = await el.textContent();
      const tagName = await el.evaluate(node => node.tagName);
      const isVisible = await el.isVisible();
      const role = await el.getAttribute('role');

      console.log(`[${i + 1}]:`);
      console.log(`  Tag: ${tagName}`);
      console.log(`  Text: ${text?.trim()}`);
      console.log(`  Visible: ${isVisible}`);
      console.log(`  Role: ${role || 'N/A'}\n`);
    }

    // Save HTML after dropdown click
    const html = await page.content();
    fs.writeFileSync('/tmp/after-dropdown.html', html);
    console.log('✓ HTML saved: /tmp/after-dropdown.html');

  } catch (error: any) {
    console.error('Error:', error.message);

    // Save error screenshot
    await page.screenshot({
      path: '/tmp/error-state.png',
      fullPage: true,
    });
    console.log('✓ Error screenshot saved');
  } finally {
    await browser.close();
  }
}

debugCreateDropdown()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
