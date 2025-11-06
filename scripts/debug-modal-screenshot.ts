/**
 * Debug: Take screenshot of the modal dialog blocking the editor
 */

import { chromium } from 'playwright';

async function debugModalScreenshot() {
  console.log('=== Debugging Modal Dialog ===\n');

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
    await fileInput.setInputFiles('/tmp/test.hwp');
    await dashboardPage.waitForSelector('text="test.hwp"', { timeout: 60000, state: 'visible' });
    await dashboardPage.waitForTimeout(2000);

    const newPagePromise = context.waitForEvent('page', { timeout: 30000 });
    await dashboardPage.click('text="test.hwp"');

    const editorPage = await newPagePromise;
    await editorPage.waitForURL('**/webhwp/**', { timeout: 30000 });
    await editorPage.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✓ Editor opened\n');

    // Wait for document to render
    await editorPage.waitForTimeout(4000);

    // Take full page screenshot
    console.log('3. Taking screenshot of editor with modal...');
    await editorPage.screenshot({ path: '/tmp/editor-with-modal.png', fullPage: true });
    console.log('✓ Screenshot saved: /tmp/editor-with-modal.png');

    // Check if modal is visible
    const modalDialog = editorPage.locator('#modal_dialog');
    const isModalVisible = await modalDialog.isVisible().catch(() => false);
    console.log(`\nModal visible: ${isModalVisible ? 'YES' : 'NO'}`);

    if (isModalVisible) {
      // Get all text content from modal
      const modalText = await modalDialog.textContent();
      console.log(`\nModal text content:\n${modalText}\n`);

      // Find all buttons in modal
      const buttons = await editorPage.locator('#modal_dialog button').all();
      console.log(`Buttons in modal: ${buttons.length}`);
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].textContent();
        const isVisible = await buttons[i].isVisible();
        const dataValue = await buttons[i].getAttribute('data-value');
        console.log(`  [${i}] Text: "${text?.trim()}", Visible: ${isVisible}, data-value: ${dataValue}`);
      }
    }

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugModalScreenshot()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
