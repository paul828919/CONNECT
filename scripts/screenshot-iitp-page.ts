/**
 * Screenshot IITP Page and Test Selectors
 */

import { chromium } from 'playwright';

async function screenshotPage() {
  console.log('📸 Taking screenshot and testing selectors...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const testUrl = 'http://ezone.iitp.kr/common/anno/01/form.tab?PMS_DMSY_PBNC_ID=DSP2025001';
    console.log(`📄 URL: ${testUrl}\n`);

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('✅ Page loaded (networkidle)\n');

    // Wait longer for dynamic content
    await page.waitForTimeout(5000);
    console.log('✅ Waited 5 seconds for dynamic content\n');

    // Take screenshot
    await page.screenshot({ path: '/tmp/iitp-page.png', fullPage: true });
    console.log('✅ Screenshot saved to /tmp/iitp-page.png\n');

    // Test different selectors
    const selectors = [
      '.view-content',
      '.board-view',
      '.content-area',
      'article',
      'main',
      '#content',
      '.content',
      'table',
      '.table',
      'tbody',
    ];

    console.log('🔍 Testing selectors:\n');
    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent() || '';
        const preview = text.replace(/\s+/g, ' ').trim().substring(0, 150);
        console.log(`✅ "${selector}" found (${text.length} chars): ${preview}...`);
      } else {
        console.log(`❌ "${selector}" not found`);
      }
    }

    // Get all text from body
    console.log('\n📝 Full body text (first 3000 chars):');
    console.log('═'.repeat(80));
    const bodyText = await page.textContent('body') || '';
    console.log(bodyText.substring(0, 3000).replace(/\s+/g, ' ').trim());
    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

screenshotPage().catch(console.error);
