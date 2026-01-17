/**
 * Test script to verify NTIS date filter functionality
 */
import { chromium } from 'playwright';

async function testNTISDateFilter() {
  console.log('='.repeat(60));
  console.log('NTIS Date Filter Test');
  console.log('='.repeat(60));

  console.log('\n1. Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; ConnectBot/1.0; +https://connectplt.kr/bot)',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Step 1: Navigate to NTIS
    console.log('\n2. Navigating to NTIS...');
    await page.goto('https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(3000);

    // Check initial page state
    const initialText = await page.textContent('h3.t_head');
    console.log('   Initial results:', initialText?.trim());

    // Step 2: Set date filter for Dec 19, 2025
    console.log('\n3. Setting date filter: 2025-12-19 to 2025-12-19...');

    // Check if jQuery is available
    const jqueryAvailable = await page.evaluate(() => {
      const w = window as any;
      return {
        hasJQuery: !!w.$,
        hasDatepicker: !!(w.$ && w.$.datepicker),
        hasFnSearch: typeof w.fn_search === 'function',
      };
    });
    console.log('   jQuery status:', jqueryAvailable);

    if (!jqueryAvailable.hasDatepicker) {
      throw new Error('jQuery Datepicker not available on page');
    }

    // Set dates using jQuery datepicker
    await page.evaluate(() => {
      const w = window as any;
      const $ = w.$;
      const startInput = $('#searchCondition2');
      const endInput = $('#searchCondition3');

      // December is month 11 (0-indexed)
      startInput.datepicker('setDate', new Date(2025, 11, 19));
      endInput.datepicker('setDate', new Date(2025, 11, 19));
    });
    console.log('   Date filter set via jQuery datepicker');

    // Verify dates were set correctly
    const actualDates = await page.evaluate(() => {
      const startInput = document.getElementById('searchCondition2') as HTMLInputElement;
      const endInput = document.getElementById('searchCondition3') as HTMLInputElement;
      return {
        start: startInput?.value || '(empty)',
        end: endInput?.value || '(empty)'
      };
    });
    console.log('   Actual date values in form:', actualDates);

    // Step 3: Submit form
    console.log('\n4. Submitting form via fn_search(1, "")...');
    await page.evaluate(() => {
      const w = window as any;
      if (typeof w.fn_search === 'function') {
        w.fn_search('1', '');
      } else {
        throw new Error('fn_search function not found');
      }
    });

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForTimeout(5000);

    // Check filtered results
    const filteredText = await page.textContent('h3.t_head');
    console.log('\n5. Results after filter:');
    console.log('   Filtered results:', filteredText?.trim());

    // Check if announcements are visible
    const rows = await page.$$('table.basic_list tbody tr');
    console.log('   Table rows found:', rows.length);

    // Get first few announcement titles
    if (rows.length > 0) {
      console.log('\n6. First 3 announcements:');
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        const titleCell = await rows[i].$('td:nth-child(4)');
        const title = await titleCell?.textContent();
        console.log(`   ${i + 1}. ${title?.trim().substring(0, 70)}...`);
      }
    }

    // Also get the body text to check regex match
    const bodyText = await page.textContent('body');
    const resultsMatch = bodyText?.match(/검색결과[:\s]*(\d+)\s*건/i);
    console.log('\n7. Regex match test:');
    console.log('   Pattern: /검색결과[:\\s]*(\\d+)\\s*건/i');
    console.log('   Match result:', resultsMatch ? `Found: ${resultsMatch[0]} (count: ${resultsMatch[1]})` : 'NO MATCH');

    // Alternative: Check for comma-separated numbers
    const resultsMatchWithComma = bodyText?.match(/검색결과[:\s]*([\d,]+)\s*건/i);
    console.log('   Pattern with comma: /검색결과[:\\s]*([\\d,]+)\\s*건/i');
    console.log('   Match result:', resultsMatchWithComma ? `Found: ${resultsMatchWithComma[0]} (count: ${resultsMatchWithComma[1]})` : 'NO MATCH');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n' + '='.repeat(60));
    console.log('Test complete');
    console.log('='.repeat(60));
  }
}

testNTISDateFilter();
