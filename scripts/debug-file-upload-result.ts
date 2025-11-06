/**
 * Debug: Upload file and capture what appears on screen
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

async function debugFileUploadResult() {
  console.log('=== Debugging File Upload Result ===\n');

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
    console.log('1. Logging in...');
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.click('button:has-text("로그인"), a:has-text("로그인")');
    await page.waitForURL('**/oauth2/authorize**', { timeout: 15000 });
    await page.fill('input[type="text"], input[type="email"], input[name="userId"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("로그인"), button[type="submit"]');
    await page.waitForURL('**/ko/home**', { timeout: 20000 });
    console.log('✓ Logged in\n');

    // Screenshot before upload
    await page.screenshot({ path: '/tmp/before-file-upload.png' });
    console.log('✓ Screenshot: /tmp/before-file-upload.png');

    // Upload file via hidden input
    console.log('\n2. Uploading file via hidden input...');
    const fileInput = page.locator('input#contained-button-file[type="file"]');

    // Create a test file
    const testFilePath = '/tmp/test-upload.hwp';
    fs.writeFileSync(testFilePath, 'Test HWP content');

    await fileInput.setInputFiles(testFilePath);
    console.log('✓ File set on input element');

    // Wait a bit for upload to start/complete
    await page.waitForTimeout(5000);

    // Screenshot after upload
    await page.screenshot({ path: '/tmp/after-file-upload.png', fullPage: true });
    console.log('✓ Screenshot: /tmp/after-file-upload.png');

    // Check what text appears on the page
    const pageText = await page.textContent('body');
    console.log('\n3. Page text search:');
    console.log('Contains "업로드":', pageText?.includes('업로드') ? 'YES' : 'NO');
    console.log('Contains "완료":', pageText?.includes('완료') ? 'YES' : 'NO');
    console.log('Contains "upload":', pageText?.toLowerCase().includes('upload') ? 'YES' : 'NO');

    // Check for notifications/toasts
    const notifications = await page.locator('[role="alert"], [role="status"], .notification, .toast, [class*="snackbar"], [class*="Snackbar"]').all();
    console.log(`\nNotifications found: ${notifications.length}`);
    for (let i = 0; i < notifications.length; i++) {
      const text = await notifications[i].textContent();
      const isVisible = await notifications[i].isVisible();
      console.log(`  [${i}] Visible: ${isVisible}, Text: ${text?.substring(0, 100)}`);
    }

    // Check for any elements containing the filename
    const filenameElements = await page.locator('text=/test-upload.hwp/i').all();
    console.log(`\nElements with filename: ${filenameElements.length}`);
    for (let i = 0; i < filenameElements.length; i++) {
      const text = await filenameElements[i].textContent();
      const tagName = await filenameElements[i].evaluate(node => node.tagName);
      const isVisible = await filenameElements[i].isVisible();
      console.log(`  [${i}] ${tagName}, Visible: ${isVisible}, Text: ${text?.substring(0, 50)}`);
    }

    // Save HTML
    const html = await page.content();
    fs.writeFileSync('/tmp/after-file-upload.html', html);
    console.log('\n✓ HTML saved: /tmp/after-file-upload.html');

  } catch (error: any) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/tmp/error-upload-debug.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugFileUploadResult()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
