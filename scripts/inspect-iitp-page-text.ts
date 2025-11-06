/**
 * Inspect IITP Page Text - See what's actually on the page
 */

import { chromium } from 'playwright';

async function inspectPageText() {
  console.log('🔍 Inspecting IITP Page Text...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const testUrl = 'http://ezone.iitp.kr/common/anno/01/form.tab?PMS_DMSY_PBNC_ID=DSP2025001';
    console.log(`📄 URL: ${testUrl}\n`);

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Get the content area text
    const contentArea = await page.$('.view-content, .board-view, .content-area, article');

    if (contentArea) {
      const contentText = await contentArea.textContent() || '';
      console.log('📝 Content area text (full):');
      console.log('═'.repeat(80));
      console.log(contentText);
      console.log('═'.repeat(80));
    } else {
      console.log('❌ Content area not found');

      // Get body text
      const bodyText = await page.textContent('body') || '';
      console.log('📝 Body text (first 5000 chars):');
      console.log('═'.repeat(80));
      console.log(bodyText.substring(0, 5000));
      console.log('═'.repeat(80));
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

inspectPageText().catch(console.error);
