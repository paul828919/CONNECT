/**
 * Debug: Click the "문서 업로드" button and see what happens
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

async function debugUploadButtonClick() {
  console.log('=== Debugging Upload Button Click ===\n');

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
    // Login
    console.log('1. Logging in...');
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("로그인"), a:has-text("로그인")');
    await page.waitForURL('**/oauth2/authorize**', { timeout: 15000 });
    await page.fill('input[type="text"], input[type="email"], input[name="userId"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("로그인"), button[type="submit"]');
    await page.waitForURL('**/ko/home**', { timeout: 20000 });
    console.log('✓ Logged in\n');

    // Screenshot before click
    await page.screenshot({ path: '/tmp/before-upload-click.png' });
    console.log('✓ Screenshot saved: /tmp/before-upload-click.png');

    // Set up listener for file chooser
    let fileChooserOpened = false;
    page.on('filechooser', () => {
      fileChooserOpened = true;
      console.log('✓✓✓ FILE CHOOSER OPENED! ✓✓✓');
    });

    // Click the upload button
    console.log('\n2. Clicking "문서 업로드" button...');
    await page.click('button:has-text("문서 업로드")');
    console.log('✓ Button clicked');

    // Wait to see what happens
    await page.waitForTimeout(2000);

    // Screenshot after click
    await page.screenshot({ path: '/tmp/after-upload-click.png' });
    console.log('✓ Screenshot saved: /tmp/after-upload-click.png');

    // Check if file chooser opened
    console.log(`\nFile chooser opened: ${fileChooserOpened ? 'YES' : 'NO'}`);

    // Check page URL
    console.log(`Page URL: ${page.url()}`);

    // Look for any modals or dialogs
    const modals = await page.locator('[role="dialog"], [role="modal"], .modal, .dialog').all();
    console.log(`\nModals/Dialogs found: ${modals.length}`);

    // Look for file input elements
    const fileInputs = await page.locator('input[type="file"]').all();
    console.log(`File input elements: ${fileInputs.length}`);

    for (let i = 0; i < fileInputs.length; i++) {
      const input = fileInputs[i];
      const isVisible = await input.isVisible();
      const style = await input.getAttribute('style');
      console.log(`  [${i + 1}] Visible: ${isVisible}, Style: ${style}`);
    }

    // Save HTML
    const html = await page.content();
    fs.writeFileSync('/tmp/after-upload-button-click.html', html);
    console.log('\n✓ HTML saved: /tmp/after-upload-button-click.html');

  } catch (error: any) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error.png' });
  } finally {
    await browser.close();
  }
}

debugUploadButtonClick()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
