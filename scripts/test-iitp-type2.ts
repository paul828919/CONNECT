/**
 * Test IITP Type 2 announcement (actual funding opportunity)
 */

import { chromium } from 'playwright';
import { parseIITPDetails } from '../lib/scraping/parsers/iitp-parser';

async function testType2() {
  console.log('🔍 Testing IITP Type 2 Announcement (Actual Funding)...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // User's second example - actual funding announcement
    const testUrl = 'http://ezone.iitp.kr/common/anno/02/form.tab?PMS_TSK_PBNC_ID=PBD202500000069';
    console.log(`📄 URL: ${testUrl}`);
    console.log('📝 Title: 2025년도 제5차 디지털혁신기술국제공동연구사업 신규지원 대상과제 공고\n');

    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/iitp-type2.png', fullPage: true });
    console.log('✅ Screenshot saved to /tmp/iitp-type2.png\n');

    // Run parser
    console.log('🔬 Running parseIITPDetails...\n');
    const result = await parseIITPDetails(page, testUrl);

    console.log('📊 Parser Results:');
    console.log('─'.repeat(80));
    console.log(`deadline: ${result.deadline ? result.deadline.toISOString().split('T')[0] : '❌ NULL'}`);
    console.log(`budgetAmount: ${result.budgetAmount !== null ? result.budgetAmount.toLocaleString() + ' won' : '❌ NULL'}`);
    console.log(`targetType: ${result.targetType}`);
    console.log(`description length: ${result.description?.length || 0} characters`);
    console.log('─'.repeat(80));

    // Get page text and search for deadline keywords manually
    const bodyText = await page.textContent('body') || '';

    console.log('\n🔍 Manual Deadline Keyword Search:\n');
    const keywords = ['접수기간', '신청기간', '마감', '제출기한', '접수마감'];

    for (const keyword of keywords) {
      if (bodyText.includes(keyword)) {
        const index = bodyText.indexOf(keyword);
        const context = bodyText.substring(Math.max(0, index - 50), Math.min(bodyText.length, index + 300));
        console.log(`"${keyword}" found:`);
        console.log(context.replace(/\s+/g, ' ').trim());
        console.log('');
      }
    }

    // Check content type
    console.log('\n📋 Content Type Analysis:');
    console.log(`Is Survey (기술수요조사): ${bodyText.includes('기술수요조사') ? '❌ YES (should be filtered)' : '✅ NO (valid funding)'}`);
    console.log(`Is Funding Announcement (공고): ${bodyText.includes('신규지원') ? '✅ YES' : '❌ NO'}`);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testType2().catch(console.error);
