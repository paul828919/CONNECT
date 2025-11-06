/**
 * Test NTIS Parser Fix (Local Verification)
 *
 * Verifies regex-based extraction works on real NTIS announcement page
 * Tests Phase 1 changes before applying to production database
 */

import { chromium } from 'playwright';
import { parseNTISAnnouncementDetails } from '../lib/scraping/parsers/ntis-announcement-parser';

async function testNTISParser() {
  console.log('🧪 Testing fixed NTIS parser with real announcement page...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Test URL from previous debugging sessions
    // This is a known NTIS announcement that should have publishedAt, deadline, and budget
    const testUrl = 'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?progrmSn=549050';

    console.log(`📄 Testing URL: ${testUrl}\n`);

    // Parse the page with fixed regex-based extractor
    const result = await parseNTISAnnouncementDetails(page, testUrl);

    console.log('✅ Extraction Results:');
    console.log('─'.repeat(60));
    console.log(`publishedAt: ${result.publishedAt || '❌ NULL'}`);
    console.log(`deadline: ${result.deadline || '❌ NULL'}`);
    console.log(`budgetAmount: ${result.budgetAmount !== null ? result.budgetAmount.toLocaleString() + ' won' : '❌ NULL'}`);
    console.log(`ministry: ${result.ministry || '❌ NULL'}`);
    console.log(`announcingAgency: ${result.announcingAgency || '❌ NULL'}`);
    console.log(`targetType: ${result.targetType}`);
    console.log(`description: ${result.description?.substring(0, 100)}...`);
    console.log('─'.repeat(60));

    // Calculate success rate
    const fields = ['publishedAt', 'deadline', 'budgetAmount', 'ministry', 'announcingAgency'];
    const extracted = fields.filter(field => result[field as keyof typeof result] !== null).length;
    const successRate = Math.round((extracted / fields.length) * 100);

    console.log(`\n📊 Extraction Success Rate: ${extracted}/${fields.length} fields (${successRate}%)`);

    if (successRate >= 60) {
      console.log('✅ PASS: Parser successfully extracts from NTIS plain text format');
    } else {
      console.log('❌ FAIL: Parser still not extracting correctly');
      console.log('\n🔍 Debugging - Page text preview:');
      const bodyText = await page.textContent('body') || '';
      console.log(bodyText.substring(0, 500));
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testNTISParser().catch(console.error);
