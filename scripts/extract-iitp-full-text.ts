/**
 * Extract full text from IITP page to analyze content type
 */

import { chromium } from 'playwright';

async function extractFullText() {
  console.log('📝 Extracting full IITP page content...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const testUrl = 'http://ezone.iitp.kr/common/anno/01/form.tab?PMS_DMSY_PBNC_ID=DSP2025001';
    console.log(`📄 URL: ${testUrl}\n`);

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Get .content text (the actual content area)
    const contentElement = await page.$('.content');

    if (contentElement) {
      const contentText = await contentElement.textContent() || '';
      console.log('📋 Full .content text:');
      console.log('═'.repeat(80));
      console.log(contentText);
      console.log('═'.repeat(80));

      // Analyze content
      console.log('\n🔍 Content Analysis:');
      console.log(`Total length: ${contentText.length} chars`);
      console.log(`Contains "기술수요조사": ${contentText.includes('기술수요조사') ? '✅ YES' : '❌ NO'}`);
      console.log(`Contains "공고": ${contentText.includes('공고') ? '✅ YES' : '❌ NO'}`);
      console.log(`Contains "마감": ${contentText.includes('마감') ? '✅ YES' : '❌ NO'}`);
      console.log(`Contains "접수": ${contentText.includes('접수') ? '✅ YES' : '❌ NO'}`);
      console.log(`Contains "신청": ${contentText.includes('신청') ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('❌ .content selector not found');
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

extractFullText().catch(console.error);
