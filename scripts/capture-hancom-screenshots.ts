/**
 * Capture up to 4 pages of HWP document from Hancom Docs editor
 *
 * Strategy:
 * 1. Login and upload HWP file
 * 2. Open editor
 * 3. Take initial screenshot
 * 4. Press Page Down to go to next page
 * 5. Take screenshot
 * 6. Repeat for up to 4 pages
 */

import { chromium } from 'playwright';
import * as fs from 'fs';

const HANCOM_EMAIL = process.env.HANCOM_DOCS_ID || 'kbj20415@gmail.com';
const HANCOM_PASSWORD = process.env.HANCOM_DOCS_PW || 'BSiw237877^^';

async function captureHancomScreenshots() {
  console.log('=== Capturing Hancom Docs Screenshots (4 pages) ===\n');

  const hwpFilePath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';
  const fileName = '(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  if (!fs.existsSync(hwpFilePath)) {
    console.error('❌ Test HWP file not found');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
  });

  const page = await context.newPage();

  try {
    // Login
    console.log('Logging in...');
    await page.goto('https://www.hancomdocs.com/ko/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/oauth2/authorize**', { timeout: 30000 });
    await page.getByRole('textbox', { name: '이메일' }).fill(HANCOM_EMAIL);
    await page.getByRole('textbox', { name: '비밀번호' }).fill(HANCOM_PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL('**/ko/home', { timeout: 30000 });
    console.log('✓ Login successful\n');

    // Upload
    console.log('Uploading file...');
    const fileInput = page.locator('#contained-button-file');
    await fileInput.setInputFiles(hwpFilePath);
    await page.waitForSelector('text=/.*업로드.*완료.*/', { state: 'visible', timeout: 15000 });
    console.log('✓ Upload complete\n');

    // Open editor
    console.log('Opening editor...');
    const fileNameShort = fileName.substring(0, 30);
    let toastLink;
    try {
      toastLink = page.locator(`text="${fileName}"`).first();
      await toastLink.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      try {
        toastLink = page.getByText(fileNameShort, { exact: false }).first();
        await toastLink.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        toastLink = page.locator('[class*="toast"] a, [class*="notification"] a').first();
        await toastLink.waitFor({ state: 'visible', timeout: 3000 });
      }
    }

    const newPagePromise = context.waitForEvent('page', { timeout: 60000 });
    await toastLink.click();
    const editorPage = await newPagePromise;
    await editorPage.waitForLoadState('domcontentloaded');
    console.log('✓ Editor opened\n');

    // Wait for editor to load
    console.log('Waiting for content to render...');
    await editorPage.waitForURL('**/webhwp/?mode=HWP_EDITOR**', { timeout: 30000 });
    await editorPage.waitForSelector('text=파일', { state: 'visible', timeout: 30000 });

    // Dismiss modals
    try {
      await editorPage.evaluate(() => {
        document.querySelectorAll('#modal_dialog, .modal_dialog').forEach((el) => {
          if (el instanceof HTMLElement) el.style.display = 'none';
        });
      });
    } catch {}

    await editorPage.waitForTimeout(3000);
    console.log('✓ Content ready\n');

    // Find document content area
    console.log('Finding document content area...');
    const contentSelectors = [
      '#editor_container',
      '#document_container',
      '#content_area',
      '.editor_content',
      '[id*="editor"]',
      '[class*="editor"][class*="content"]',
    ];

    let contentArea = null;
    for (const selector of contentSelectors) {
      try {
        const element = editorPage.locator(selector).first();
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          contentArea = element;
          console.log(`✓ Found content area: ${selector}\n`);
          break;
        }
      } catch {}
    }

    if (!contentArea) {
      console.log('⚠ Content area not found, using full page\n');
    }

    // Capture up to 4 pages
    console.log('Capturing screenshots...');
    const screenshots: string[] = [];
    const maxPages = 4;

    for (let i = 0; i < maxPages; i++) {
      const screenshotPath = `/tmp/hancom-page-${i + 1}.png`;

      try {
        if (contentArea) {
          await contentArea.screenshot({ path: screenshotPath, type: 'png' });
        } else {
          await editorPage.screenshot({ path: screenshotPath, type: 'png' });
        }
        screenshots.push(screenshotPath);
        console.log(`✓ Page ${i + 1} captured: ${screenshotPath}`);
      } catch (error: any) {
        console.log(`⚠ Could not capture page ${i + 1}: ${error.message}`);
        break;
      }

      // Navigate to next page (except on last iteration)
      if (i < maxPages - 1) {
        // Try Page Down key
        await editorPage.keyboard.press('PageDown');
        await editorPage.waitForTimeout(1500);

        // Check if we're still on a different page
        // (If content hasn't changed much, we've reached the end)
      }
    }

    console.log(`\n✅ Captured ${screenshots.length} screenshot(s)`);
    console.log('\nScreenshots saved to:');
    screenshots.forEach((path) => console.log(`  - ${path}`));

    console.log('\n✓ Success! Browser will stay open for inspection.');
    console.log('Press Ctrl+C to close.\n');

    // Keep browser open
    await new Promise(() => {});

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

captureHancomScreenshots();
