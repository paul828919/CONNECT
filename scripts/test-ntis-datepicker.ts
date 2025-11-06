#!/usr/bin/env npx tsx
/**
 * Test script to verify jQuery datepicker date setting on NTIS
 */

import { chromium } from 'playwright';

async function testDatepickerSubmission() {
  console.log('🚀 Testing NTIS datepicker form submission...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to NTIS
    console.log('🌐 Navigating to NTIS...');
    await page.goto('https://www.ntis.go.kr/rndgate/eg/un/ap/aplDmndList.do', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(3000);

    // Take screenshot of initial state
    console.log('📸 Screenshot: Initial state');
    await page.screenshot({ path: '/tmp/ntis-test-01-initial.png', fullPage: true });

    // Scroll to date filter section
    console.log('📜 Scrolling to date filter...');
    await page.evaluate(() => {
      const dateInput = document.getElementById('searchCondition2');
      if (dateInput) {
        dateInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    await page.waitForTimeout(1000);

    // Set dates using jQuery datepicker API
    console.log('📅 Setting dates using jQuery datepicker API...');
    const setDatesResult = await page.evaluate(() => {
      try {
        // Check if jQuery is available
        if (typeof (window as any).$ === 'undefined') {
          return { success: false, error: 'jQuery not found' };
        }

        const $ = (window as any).$;

        // Set start date (2025-01-01)
        const startDateInput = $('#searchCondition2');
        if (startDateInput.length && startDateInput.datepicker) {
          startDateInput.datepicker('setDate', new Date(2025, 0, 1)); // Month is 0-indexed
          console.log('Start date set:', startDateInput.val());
        }

        // Set end date (2025-03-31)
        const endDateInput = $('#searchCondition3');
        if (endDateInput.length && endDateInput.datepicker) {
          endDateInput.datepicker('setDate', new Date(2025, 2, 31)); // Month is 0-indexed
          console.log('End date set:', endDateInput.val());
        }

        return {
          success: true,
          startDate: startDateInput.val(),
          endDate: endDateInput.val(),
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    console.log('📅 Date setting result:', setDatesResult);

    // Take screenshot after setting dates
    await page.waitForTimeout(1000);
    console.log('📸 Screenshot: After setting dates');
    await page.screenshot({ path: '/tmp/ntis-test-02-dates-set.png', fullPage: true });

    // Submit form by calling fn_search()
    console.log('🔍 Submitting form via fn_search()...');
    await page.evaluate(() => {
      if (typeof (window as any).fn_search === 'function') {
        (window as any).fn_search('1', '');
      } else {
        console.error('fn_search function not found');
      }
    });

    // Wait for results
    console.log('⏳ Waiting for results to load...');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Take screenshot of results
    console.log('📸 Screenshot: After form submission');
    await page.screenshot({ path: '/tmp/ntis-test-03-results.png', fullPage: true });

    // Check result count
    const resultInfo = await page.evaluate(() => {
      // Try to find result count in various locations
      const selectors = [
        '.total strong',
        '.result_txt strong',
        'span:has-text("검색결과")',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim();
        }
      }

      return 'Result count not found';
    });

    console.log('\n✅ Test complete!');
    console.log('📊 Result count:', resultInfo);
    console.log('\n📸 Screenshots saved:');
    console.log('  - /tmp/ntis-test-01-initial.png');
    console.log('  - /tmp/ntis-test-02-dates-set.png');
    console.log('  - /tmp/ntis-test-03-results.png');

    // Keep browser open for 10 seconds to verify
    console.log('\n⏸️  Keeping browser open for 10 seconds...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testDatepickerSubmission();
