/**
 * Test Hancom Docs screenshot capture (up to 4 pages)
 *
 * This script:
 * 1. Logs into Hancom Docs
 * 2. Uploads HWP file
 * 3. Opens editor
 * 4. Captures up to 4 page screenshots
 * 5. Saves them to /tmp for inspection
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'fs';

// Hancom Docs credentials
const HANCOM_EMAIL = process.env.HANCOM_DOCS_ID || process.env.HANCOM_EMAIL || 'kbj20415@gmail.com';
const HANCOM_PASSWORD = process.env.HANCOM_DOCS_PW || process.env.HANCOM_PASSWORD || 'BSiw237877^^';

async function testScreenshotCapture() {
  console.log('=== Testing Hancom Docs Screenshot Capture (4 pages) ===\n');

  const hwpFilePath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';
  const fileName = '(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  if (!fs.existsSync(hwpFilePath)) {
    console.error('❌ Test HWP file not found');
    process.exit(1);
  }

  console.log(`✓ Test file: ${fileName}\n`);

  const browser = await chromium.launch({
    headless: false, // Visible mode to see what's happening
    slowMo: 500, // Slow down for observation
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  const page = await context.newPage();

  try {
    // 1. Login
    console.log('Step 1: Logging into Hancom Docs...');
    await page.goto('https://www.hancomdocs.com/ko/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('**/oauth2/authorize**', { timeout: 30000 });

    await page.getByRole('textbox', { name: '이메일' }).fill(HANCOM_EMAIL);
    await page.getByRole('textbox', { name: '비밀번호' }).fill(HANCOM_PASSWORD);
    await page.getByRole('button', { name: '로그인', exact: true }).click();
    await page.waitForURL('**/ko/home', { timeout: 30000 });
    console.log('  ✓ Login successful\n');

    // 2. Upload file
    console.log('Step 2: Uploading HWP file...');
    const fileInput = page.locator('#contained-button-file');
    await fileInput.setInputFiles(hwpFilePath);
    console.log('  ✓ File uploaded, waiting for toast...\n');

    // 3. Wait for toast and click to open editor
    console.log('Step 3: Opening editor...');
    await page.waitForSelector('text=/.*업로드.*완료.*/', { state: 'visible', timeout: 15000 });
    console.log('  ✓ Upload toast detected');

    // Try multiple selectors for the toast link (same logic as working code)
    const fileNameShort = fileName.substring(0, 30);
    const fileNameVeryShort = fileName.substring(0, 15);

    let toastLink;
    try {
      toastLink = page.locator(`text="${fileName}"`).first();
      await toastLink.waitFor({ state: 'visible', timeout: 3000 });
      console.log('  ✓ Found toast link by full filename');
    } catch {
      try {
        toastLink = page.getByText(fileNameShort, { exact: false }).first();
        await toastLink.waitFor({ state: 'visible', timeout: 3000 });
        console.log('  ✓ Found toast link by short filename');
      } catch {
        try {
          toastLink = page.getByText(fileNameVeryShort, { exact: false }).first();
          await toastLink.waitFor({ state: 'visible', timeout: 3000 });
          console.log('  ✓ Found toast link by very short filename');
        } catch {
          toastLink = page.locator('[class*="toast"] a, [class*="notification"] a, [class*="snackbar"] a').first();
          await toastLink.waitFor({ state: 'visible', timeout: 3000 });
          console.log('  ✓ Found toast link by class selector');
        }
      }
    }

    const newPagePromise = context.waitForEvent('page', { timeout: 60000 });
    await toastLink.click();
    console.log('  ✓ Toast link clicked, waiting for new page...');

    const editorPage = await newPagePromise;
    await editorPage.waitForLoadState('domcontentloaded');
    console.log('  ✓ Editor opened\n');

    // 4. Wait for editor to load
    console.log('Step 4: Waiting for editor to render content...');
    await editorPage.waitForURL('**/webhwp/?mode=HWP_EDITOR**', { timeout: 30000 });
    await editorPage.waitForSelector('text=파일', { state: 'visible', timeout: 30000 });

    // Dismiss any modals
    try {
      await editorPage.evaluate(() => {
        const modals = document.querySelectorAll('#modal_dialog, .modal_dialog');
        modals.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none';
          }
        });
      });
    } catch {}

    await editorPage.waitForTimeout(3000);
    console.log('  ✓ Editor ready\n');

    // 5. Capture screenshots of up to 4 pages
    console.log('Step 5: Capturing screenshots (up to 4 pages)...');

    const screenshots: string[] = [];

    // Take full-page screenshot
    const fullPagePath = '/tmp/hancom-page-full.png';
    await editorPage.screenshot({
      path: fullPagePath,
      fullPage: true,
      type: 'png',
    });
    screenshots.push(fullPagePath);
    console.log(`  ✓ Full page screenshot: ${fullPagePath}`);

    //Try to find and screenshot individual pages if they exist
    const pageSelectors = [
      '.hwp_page',
      '[class*="page"]',
      '#page_1, #page_2, #page_3, #page_4',
    ];

    let pagesFound = false;
    for (const selector of pageSelectors) {
      const pages = await editorPage.locator(selector).all();
      if (pages.length > 0) {
        console.log(`  Found ${pages.length} pages with selector: ${selector}`);
        pagesFound = true;

        for (let i = 0; i < Math.min(pages.length, 4); i++) {
          try {
            const pagePath = `/tmp/hancom-page-${i + 1}.png`;
            await pages[i].screenshot({ path: pagePath, type: 'png' });
            screenshots.push(pagePath);
            console.log(`  ✓ Page ${i + 1} screenshot: ${pagePath}`);
          } catch (error: any) {
            console.log(`  ⚠ Could not screenshot page ${i + 1}: ${error.message}`);
          }
        }
        break;
      }
    }

    if (!pagesFound) {
      console.log('  ℹ Individual pages not found, using full page screenshot only');
    }

    console.log(`\n✅ Captured ${screenshots.length} screenshot(s)`);
    console.log('\nScreenshots saved to:');
    screenshots.forEach((path) => console.log(`  - ${path}`));

    console.log('\n📸 Please review the screenshots to verify HWP rendering quality.');
    console.log('   Once verified, we can integrate OCR (Tesseract or GPT-4 Vision).');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    console.log('\nPress Ctrl+C to close browser...');
    await new Promise(() => {}); // Keep browser open for inspection
  }
}

testScreenshotCapture();
