/**
 * Diagnostic test for NTIS date filter behavior
 * Tests what the scheduled scraper actually sees
 */
import { chromium } from 'playwright';

async function testNTISDateFilter() {
  console.log('='.repeat(60));
  console.log('NTIS Date Filter Diagnostic Test');
  console.log('='.repeat(60));

  console.log('\n1. Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

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
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // Step 2: Check initial page state (no filter)
    const initialText = await page.textContent('body');
    const initialMatch = initialText?.match(/검색결과[:\s]*([\d,]+)\s*건/i);
    console.log('\n3. Initial results (no date filter):');
    console.log(`   Match: ${initialMatch ? initialMatch[0] : 'NOT FOUND'}`);

    // Step 3: Check jQuery/Datepicker availability
    const jqueryStatus = await page.evaluate(() => {
      const w = window as any;
      return {
        hasJQuery: typeof w.$ !== 'undefined',
        hasDatepicker: w.$ && typeof w.$.datepicker !== 'undefined',
        hasFnSearch: typeof w.fn_search === 'function',
        startInputExists: !!document.getElementById('searchCondition2'),
        endInputExists: !!document.getElementById('searchCondition3'),
      };
    });
    console.log('\n4. jQuery/Datepicker status:');
    console.log(`   ${JSON.stringify(jqueryStatus, null, 2)}`);

    if (!jqueryStatus.hasDatepicker) {
      throw new Error('jQuery Datepicker not available');
    }

    // Step 4: Set date filter - Dec 18-19, 2025
    console.log('\n5. Setting date filter: 2025-12-18 to 2025-12-19...');
    await page.evaluate(() => {
      const w = window as any;
      const $ = w.$;
      $('#searchCondition2').datepicker('setDate', new Date(2025, 11, 18)); // Dec = 11
      $('#searchCondition3').datepicker('setDate', new Date(2025, 11, 19));
    });

    // Step 5: Verify dates were set
    const actualDates = await page.evaluate(() => {
      const startInput = document.getElementById('searchCondition2') as HTMLInputElement;
      const endInput = document.getElementById('searchCondition3') as HTMLInputElement;
      return {
        start: startInput?.value || '(empty)',
        end: endInput?.value || '(empty)',
      };
    });
    console.log('\n6. Actual dates in form:');
    console.log(`   Start: ${actualDates.start}`);
    console.log(`   End: ${actualDates.end}`);

    // Step 6: Submit form
    console.log('\n7. Submitting search via fn_search(1, "")...');
    await page.evaluate(() => {
      const w = window as any;
      if (typeof w.fn_search === 'function') {
        w.fn_search('1', '');
      } else {
        throw new Error('fn_search not available');
      }
    });

    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Step 7: Check filtered results
    const filteredText = await page.textContent('body');
    const filteredMatch = filteredText?.match(/검색결과[:\s]*([\d,]+)\s*건/i);
    console.log('\n8. Filtered results (Dec 18-19):');
    console.log(`   Match: ${filteredMatch ? filteredMatch[0] : 'NOT FOUND'}`);
    if (filteredMatch) {
      console.log(`   Count: ${filteredMatch[1]}`);
    }

    // Step 8: Count table rows
    const rows = await page.$$('table.basic_list tbody tr');
    console.log(`\n9. Table rows found: ${rows.length}`);

    // Step 9: List first 5 announcements
    if (rows.length > 0) {
      console.log('\n10. First 5 announcements:');
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const titleCell = await rows[i].$('td:nth-child(4)');
        const title = await titleCell?.textContent();
        console.log(`   ${i + 1}. ${title?.trim().substring(0, 70)}...`);
      }
    }

    // Step 10: Test yesterday-to-today range
    console.log('\n' + '='.repeat(60));
    console.log('Testing Yesterday-to-Today Range');
    console.log('='.repeat(60));

    // Calculate yesterday and today in KST
    const nowKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yesterdayKST = new Date(nowKST);
    yesterdayKST.setDate(nowKST.getDate() - 1);

    const fromYear = yesterdayKST.getFullYear();
    const fromMonth = yesterdayKST.getMonth(); // 0-indexed for Date constructor
    const fromDay = yesterdayKST.getDate();
    const toYear = nowKST.getFullYear();
    const toMonth = nowKST.getMonth();
    const toDay = nowKST.getDate();

    console.log(`\n11. Calculated date range (KST):`);
    console.log(`   Yesterday: ${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-${String(fromDay).padStart(2, '0')}`);
    console.log(`   Today: ${toYear}-${String(toMonth + 1).padStart(2, '0')}-${String(toDay).padStart(2, '0')}`);

    // Set the dates
    await page.evaluate(
      ({ year, month, day }) => {
        const w = window as any;
        w.$('#searchCondition2').datepicker('setDate', new Date(year, month, day));
      },
      { year: fromYear, month: fromMonth, day: fromDay }
    );
    await page.evaluate(
      ({ year, month, day }) => {
        const w = window as any;
        w.$('#searchCondition3').datepicker('setDate', new Date(year, month, day));
      },
      { year: toYear, month: toMonth, day: toDay }
    );

    // Submit
    await page.evaluate(() => {
      (window as any).fn_search('1', '');
    });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Check results
    const todayText = await page.textContent('body');
    const todayMatch = todayText?.match(/검색결과[:\s]*([\d,]+)\s*건/i);
    console.log(`\n12. Yesterday-to-Today results:`);
    console.log(`   Match: ${todayMatch ? todayMatch[0] : 'NOT FOUND'}`);

    console.log('\n' + '='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testNTISDateFilter();
