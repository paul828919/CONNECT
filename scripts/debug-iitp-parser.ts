/**
 * Debug IITP Parser - Test against live announcement page
 * Tests deadline extraction for user's example program
 */

import { chromium } from 'playwright';
import { parseIITPDetails } from '../lib/scraping/parsers/iitp-parser';

async function debugIITPParser() {
  console.log('🔍 Testing IITP Parser Against Live Page...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // User's example program
    const testUrl = 'http://ezone.iitp.kr/common/anno/01/form.tab?PMS_DMSY_PBNC_ID=DSP2025001';
    console.log(`📄 Testing URL: ${testUrl}\n`);

    // Navigate and extract page text for debugging
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if content area exists
    const contentArea = await page.$('.view-content, .board-view, .content-area, article');
    console.log(`Content area found: ${contentArea ? '✅ YES' : '❌ NO'}\n`);

    if (!contentArea) {
      // Try to find actual content structure
      console.log('🔍 Page structure analysis:');
      const bodyClasses = await page.evaluate(() => {
        const main = document.querySelector('main, #content, .content, [role="main"]');
        return main ? main.className : 'Not found';
      });
      console.log(`Main content classes: ${bodyClasses}\n`);

      // Get first 2000 chars of body text
      const bodyText = await page.textContent('body') || '';
      console.log('📝 Page text preview (first 2000 chars):');
      console.log(bodyText.substring(0, 2000));
      console.log('\n' + '─'.repeat(80) + '\n');
    }

    // Run the parser
    console.log('🔬 Running parseIITPDetails...\n');
    const result = await parseIITPDetails(page, testUrl);

    console.log('📊 Extraction Results:');
    console.log('─'.repeat(80));
    console.log(`deadline: ${result.deadline ? result.deadline.toISOString().split('T')[0] : '❌ NULL'}`);
    console.log(`budgetAmount: ${result.budgetAmount !== null ? result.budgetAmount.toLocaleString() + ' won' : '❌ NULL'}`);
    console.log(`targetType: ${result.targetType}`);
    console.log(`description length: ${result.description?.length || 0} characters`);
    console.log(`minTRL: ${result.minTRL || 'NULL'}`);
    console.log(`maxTRL: ${result.maxTRL || 'NULL'}`);
    console.log('─'.repeat(80));

    // If deadline is NULL, search for deadline keywords manually
    if (!result.deadline) {
      console.log('\n🔍 Manual deadline keyword search:');
      const fullText = await page.textContent('body') || '';

      const deadlineKeywords = ['마감', '접수기간', '신청기간', '제출기한', '신청마감'];
      for (const keyword of deadlineKeywords) {
        if (fullText.includes(keyword)) {
          // Find the context around the keyword
          const index = fullText.indexOf(keyword);
          const context = fullText.substring(Math.max(0, index - 50), Math.min(fullText.length, index + 200));
          console.log(`\n"${keyword}" found:`);
          console.log(context.replace(/\s+/g, ' ').trim());
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

debugIITPParser().catch(console.error);
