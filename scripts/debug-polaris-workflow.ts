/**
 * Debug Polaris Office workflow to identify download button selector
 *
 * This script manually walks through the Polaris conversion process
 * and takes screenshots at each step to identify the correct button selectors.
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function debugPolarisWorkflow() {
  console.log('=== Debugging Polaris Office Workflow ===\n');

  const hwpFilePath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  if (!fs.existsSync(hwpFilePath)) {
    console.error('❌ Test HWP file not found');
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false, // Run in visible mode to observe
    slowMo: 1000, // Slow down actions for observation
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    locale: 'ko-KR',
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to Polaris
    console.log('Step 1: Navigating to Polaris Office Tools...');
    await page.goto('https://www.polarisofficetools.com/hwp/convert/pdf', {
      waitUntil: 'networkidle',
    });
    await page.screenshot({ path: '/tmp/polaris-debug-1-loaded.png' });
    console.log('  ✓ Screenshot saved: /tmp/polaris-debug-1-loaded.png');
    await page.waitForTimeout(2000);

    // Step 2: Upload file
    console.log('\nStep 2: Uploading HWP file...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(hwpFilePath);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/polaris-debug-2-uploaded.png' });
    console.log('  ✓ File uploaded');
    console.log('  ✓ Screenshot saved: /tmp/polaris-debug-2-uploaded.png');

    // Step 3: Click convert button
    console.log('\nStep 3: Clicking convert button...');
    const convertButton = page.locator('button:has-text("HWP PDF로 변환")').first();
    await convertButton.click();
    console.log('  ✓ Convert button clicked');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/polaris-debug-3-converting.png' });
    console.log('  ✓ Screenshot saved: /tmp/polaris-debug-3-converting.png');

    // Step 4: Wait for conversion to complete (look for download button)
    console.log('\nStep 4: Waiting for conversion to complete...');
    console.log('  (This may take 30-90 seconds for client-side WebAssembly processing)');

    // Try different selectors that might indicate completion
    const possibleDownloadSelectors = [
      'button:has-text("다운로드")',
      'button:has-text("download")',
      'a:has-text("다운로드")',
      '[download]',
      'button[aria-label*="download"]',
      'button[class*="download"]',
    ];

    let downloadButton = null;
    let matchedSelector = null;

    for (let i = 0; i < 120; i++) { // Wait up to 2 minutes
      await page.waitForTimeout(1000);

      // Check for download button
      for (const selector of possibleDownloadSelectors) {
        const button = page.locator(selector).first();
        const isVisible = await button.isVisible().catch(() => false);
        if (isVisible) {
          downloadButton = button;
          matchedSelector = selector;
          console.log(`\n  ✓ Found download button with selector: ${selector}`);
          break;
        }
      }

      if (downloadButton) break;

      if (i % 10 === 0) {
        console.log(`  Still waiting... (${i} seconds elapsed)`);
        await page.screenshot({ path: `/tmp/polaris-debug-4-waiting-${i}s.png` });
      }
    }

    if (!downloadButton) {
      console.error('\n❌ Download button never appeared after 2 minutes');
      await page.screenshot({ path: '/tmp/polaris-debug-4-timeout.png' });
      console.log('  ✓ Timeout screenshot saved: /tmp/polaris-debug-4-timeout.png');

      // Print page content for debugging
      const pageContent = await page.content();
      fs.writeFileSync('/tmp/polaris-debug-page-content.html', pageContent);
      console.log('  ✓ Page HTML saved: /tmp/polaris-debug-page-content.html');

      await browser.close();
      process.exit(1);
    }

    await page.screenshot({ path: '/tmp/polaris-debug-5-completed.png' });
    console.log('  ✓ Screenshot saved: /tmp/polaris-debug-5-completed.png');

    // Step 5: Click download button
    console.log('\nStep 5: Clicking download button...');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await downloadButton.click();

    const download = await downloadPromise;
    console.log('  ✓ Download started');

    const pdfPath = await download.path();
    const pdfBuffer = fs.readFileSync(pdfPath!);

    console.log(`  ✓ PDF downloaded: ${pdfBuffer.length} bytes`);
    fs.writeFileSync('/tmp/polaris-debug-downloaded.pdf', pdfBuffer);
    console.log('  ✓ PDF saved: /tmp/polaris-debug-downloaded.pdf');

    console.log('\n=== SUCCESS ===');
    console.log(`\n✅ Download button selector: ${matchedSelector}`);
    console.log('\nWorkflow:');
    console.log('  1. Upload file via input[type="file"]');
    console.log('  2. Click button:has-text("HWP PDF로 변환")');
    console.log('  3. Wait for download button to appear');
    console.log(`  4. Click ${matchedSelector}`);
    console.log('  5. Wait for download event\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    await page.screenshot({ path: '/tmp/polaris-debug-error.png' });
    console.log('  ✓ Error screenshot saved: /tmp/polaris-debug-error.png');
  } finally {
    await browser.close();
  }
}

debugPolarisWorkflow();
