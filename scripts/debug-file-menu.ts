/**
 * Debug: Check File menu contents in editor
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

async function debugFileMenu() {
  console.log('=== Debugging File Menu in Editor ===\n');

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

  const dashboardPage = await context.newPage();

  try {
    // Login
    console.log('1. Logging in...');
    await dashboardPage.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await dashboardPage.click('button:has-text("로그인"), a:has-text("로그인")');
    await dashboardPage.waitForURL('**/oauth2/authorize**', { timeout: 15000 });
    await dashboardPage.fill('input[type="text"], input[type="email"], input[name="userId"]', email);
    await dashboardPage.fill('input[type="password"]', password);
    await dashboardPage.click('button:has-text("로그인"), button[type="submit"]');
    await dashboardPage.waitForURL('**/ko/home**', { timeout: 20000 });
    console.log('✓ Logged in\n');

    // Upload file
    console.log('2. Uploading file...');
    const fileInput = dashboardPage.locator('input#contained-button-file[type="file"]');
    const testFilePath = '/tmp/test.hwp';
    await fileInput.setInputFiles(testFilePath);
    console.log('✓ File uploaded');

    // Wait for filename and click it
    await dashboardPage.waitForSelector('text="test.hwp"', { timeout: 60000, state: 'visible' });
    await dashboardPage.waitForTimeout(2000);
    const newPagePromise = context.waitForEvent('page', { timeout: 30000 });
    await dashboardPage.click('text="test.hwp"');

    // Get editor page
    const editorPage = await newPagePromise;
    await editorPage.waitForURL('**/webhwp/**', { timeout: 30000 });
    await editorPage.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✓ Editor opened\n');

    // Wait for document to render
    await editorPage.waitForTimeout(3000);

    // Screenshot before clicking File menu
    await editorPage.screenshot({ path: '/tmp/editor-before-file-menu.png', fullPage: true });
    console.log('✓ Screenshot: /tmp/editor-before-file-menu.png');

    // Click File menu
    console.log('\n3. Clicking File menu...');
    await editorPage.click('button:has-text("파일"), div:has-text("파일")');
    await editorPage.waitForTimeout(1000);
    console.log('✓ File menu clicked');

    // Screenshot after clicking File menu
    await editorPage.screenshot({ path: '/tmp/editor-after-file-menu.png', fullPage: true });
    console.log('✓ Screenshot: /tmp/editor-after-file-menu.png');

    // Find all menu items
    console.log('\n4. Finding menu items...');
    const menuItems = await editorPage.locator('[role="menuitem"], [role="option"], li, a').all();
    console.log(`Total potential menu items: ${menuItems.length}\n`);

    // Look for download-related items
    const downloadRelated = await editorPage.locator('text=/PDF|다운로드|download/i').all();
    console.log(`Download-related elements: ${downloadRelated.length}`);
    for (let i = 0; i < Math.min(downloadRelated.length, 10); i++) {
      const el = downloadRelated[i];
      const text = await el.textContent();
      const tagName = await el.evaluate(node => node.tagName);
      const isVisible = await el.isVisible();
      const role = await el.getAttribute('role');
      console.log(`  [${i}] ${tagName}, Role: ${role || 'N/A'}, Visible: ${isVisible}, Text: ${text?.trim().substring(0, 50)}`);
    }

    // Save HTML
    const html = await editorPage.content();
    fs.writeFileSync('/tmp/editor-with-file-menu.html', html);
    console.log('\n✓ HTML saved: /tmp/editor-with-file-menu.html');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugFileMenu()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
