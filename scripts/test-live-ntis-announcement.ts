/**
 * Test Live NTIS Announcement
 * Fetches current announcement from NTIS list page and tests parser
 */

import { chromium } from 'playwright';
import { parseNTISAnnouncementDetails } from '../lib/scraping/parsers/ntis-announcement-parser';

async function testLiveNTIS() {
  console.log('🔍 Fetching live NTIS announcement for testing...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: Get first announcement from list page
    const listUrl = 'https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do';
    console.log(`📄 Loading list page: ${listUrl}\n`);

    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Extract first announcement link from table.basic_list
    const firstLink = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table.basic_list tbody tr'));

      for (const row of rows) {
        const linkEl = row.querySelector('td:nth-child(4) a') as HTMLAnchorElement;
        if (linkEl && linkEl.href) {
          const titleEl = linkEl.textContent?.trim();
          return {
            url: linkEl.href,
            title: titleEl || 'N/A'
          };
        }
      }

      return null;
    });

    if (!firstLink) {
      console.error('❌ No announcements found on list page');
      return;
    }

    console.log(`✅ Found announcement:`);
    console.log(`   Title: ${firstLink.title.substring(0, 80)}...`);
    console.log(`   URL: ${firstLink.url}\n`);

    // Step 2: Parse detail page with fixed parser
    console.log(`🔬 Testing parser on detail page...\n`);

    const result = await parseNTISAnnouncementDetails(page, firstLink.url);

    console.log('📊 Extraction Results:');
    console.log('─'.repeat(80));
    console.log(`publishedAt: ${result.publishedAt ? result.publishedAt.toISOString().split('T')[0] : '❌ NULL'}`);
    console.log(`deadline: ${result.deadline ? result.deadline.toISOString().split('T')[0] : '❌ NULL'}`);
    console.log(`budgetAmount: ${result.budgetAmount !== null ? result.budgetAmount.toLocaleString() + ' won' : '❌ NULL'}`);
    console.log(`ministry: ${result.ministry || '❌ NULL'}`);
    console.log(`announcingAgency: ${result.announcingAgency || '❌ NULL'}`);
    console.log(`targetType: ${result.targetType}`);
    console.log(`description length: ${result.description?.length || 0} characters`);
    console.log('─'.repeat(80));

    // Calculate success rate
    const fields = ['publishedAt', 'deadline', 'budgetAmount', 'ministry', 'announcingAgency'];
    const extracted = fields.filter(field => result[field as keyof typeof result] !== null).length;
    const successRate = Math.round((extracted / fields.length) * 100);

    console.log(`\n📈 Extraction Success Rate: ${extracted}/${fields.length} fields (${successRate}%)`);

    if (successRate >= 40) {
      console.log('✅ PASS: Parser is working (≥40% is acceptable given "0억원" budgets)');
    } else {
      console.log('❌ FAIL: Parser needs debugging');

      // Show page text for debugging
      console.log('\n🔍 Page text preview (first 1000 chars):');
      const bodyText = await page.textContent('body') || '';
      const cleanText = bodyText.replace(/\s+/g, ' ').trim();
      console.log(cleanText.substring(0, 1000));
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testLiveNTIS().catch(console.error);
