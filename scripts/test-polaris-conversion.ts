/**
 * Test Polaris Office Tools HWP → PDF Converter
 *
 * Tests the free, client-side conversion at:
 * https://www.polarisofficetools.com/hwp/convert/pdf
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function testPolarisConversion() {
  console.log('=== Testing Polaris Office Tools HWP → PDF ===\n');

  const testHwpPath = '/Users/paulkim/Downloads/(붙임1) 2026년도 한-독 양자기술 공동연구사업 신규과제 공_163296668092636.hwp';

  if (!fs.existsSync(testHwpPath)) {
    console.error(`❌ Test file not found: ${testHwpPath}`);
    process.exit(1);
  }

  console.log(`Test file: ${testHwpPath}`);
  console.log(`File size: ${fs.statSync(testHwpPath).size} bytes\n`);

  const browser = await chromium.launch({
    headless: false, // Visible for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
  });

  const page = await context.newPage();

  try {
    // Navigate to Polaris converter
    console.log('1. Navigating to Polaris Office Tools...');
    await page.goto('https://www.polarisofficetools.com/hwp/convert/pdf', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log('✓ Page loaded\n');

    // Find hidden file input
    console.log('2. Finding file input...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    console.log('✓ File input found\n');

    // Upload HWP file
    console.log('3. Uploading HWP file...');
    await fileInput.setInputFiles(testHwpPath);
    console.log('✓ File uploaded\n');

    // Wait for file to appear in list
    console.log('4. Waiting for file to appear in list...');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/polaris-after-upload.png' });
    console.log('✓ Screenshot saved: /tmp/polaris-after-upload.png\n');

    // Find and click convert button
    console.log('5. Looking for convert button...');
    const convertButton = page.locator('button:has-text("HWP PDF로 변환")').first();
    await convertButton.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Convert button found\n');

    console.log('6. Clicking convert button...');

    // Set up download listener BEFORE clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 }); // 2 minutes

    await convertButton.click();
    console.log('✓ Convert button clicked\n');

    // Wait for conversion to complete
    console.log('7. Waiting for PDF conversion...');
    console.log('   (This may take 30-60 seconds for client-side processing)\n');

    // Monitor for download button appearing
    console.log('   Monitoring for download button...');
    let download;
    try {
      await page.waitForSelector('button:has-text("다운로드"), a:has-text("다운로드"), [download]', {
        state: 'visible',
        timeout: 90000,
      });
      console.log('✓ Download button appeared!\n');

      // Take screenshot of completed state
      await page.screenshot({ path: '/tmp/polaris-conversion-complete.png' });
      console.log('✓ Screenshot: /tmp/polaris-conversion-complete.png\n');

      // Click download button
      const downloadButton = page.locator('button:has-text("다운로드"), a:has-text("다운로드"), [download]').first();

      // Set up download promise before clicking
      const downloadPromise2 = page.waitForEvent('download', { timeout: 30000 });
      await downloadButton.click();

      download = await downloadPromise2;
      console.log('✓ Download started!\n');
    } catch (downloadButtonError: any) {
      console.log('⚠️ Download button wait timed out, trying original download promise...\n');
      download = await downloadPromise;
      console.log('✓ Download started!\n');
    }

    // Save the PDF
    const downloadPath = await download.path();
    if (downloadPath) {
      const pdfBuffer = fs.readFileSync(downloadPath);
      const outputPath = '/tmp/polaris-converted.pdf';
      fs.writeFileSync(outputPath, pdfBuffer);

      console.log('=== SUCCESS ===\n');
      console.log(`✅ PDF saved: ${outputPath}`);
      console.log(`   Size: ${pdfBuffer.length} bytes`);
    } else {
      console.log('❌ Download path is null');
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);

    // Take error screenshot
    await page.screenshot({ path: '/tmp/polaris-error.png', fullPage: true });
    console.log('Error screenshot: /tmp/polaris-error.png');

    throw error;
  } finally {
    await browser.close();
  }
}

testPolarisConversion()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
