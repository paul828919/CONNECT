/**
 * NTIS date filtering using jQuery datepicker form submission
 * Extracted from scripts/scrape-ntis-historical.ts for reuse in daily scraper
 *
 * IMPORTANT: NTIS does NOT accept date filters via URL query params.
 * Must use form submission with jQuery datepicker API.
 */
import { Page } from 'playwright';
import { validateAndParseDate } from './date-utils';

export interface NTISDateFilterOptions {
  fromDate: string; // YYYY-MM-DD format (e.g., '2025-10-24')
  toDate: string;   // YYYY-MM-DD format (e.g., '2025-10-26')
  pageNum?: number; // Page number for pagination (default: 1)
}

/**
 * Navigate to NTIS listing page with date filter applied
 * Uses jQuery datepicker API and form submission (fn_search)
 *
 * Process:
 * 1. Navigate to NTIS announcement page
 * 2. Set start/end dates using jQuery datepicker API
 * 3. Verify dates were set correctly
 * 4. Submit form using fn_search() function
 * 5. Wait for filtered results to load
 *
 * @param page Playwright page instance
 * @param options Date filter options (fromDate, toDate, pageNum)
 * @throws Error if datepicker API unavailable, dates invalid, or verification fails
 *
 * @example
 * await applyNTISDateFilter(page, {
 *   fromDate: '2025-10-24',
 *   toDate: '2025-10-26',
 *   pageNum: 1
 * });
 */
export async function applyNTISDateFilter(
  page: Page,
  options: NTISDateFilterOptions
): Promise<void> {
  const { fromDate, toDate, pageNum = 1 } = options;

  // Validate and parse dates (throws on invalid dates)
  const from = validateAndParseDate(fromDate);
  const to = validateAndParseDate(toDate);

  // Navigate to NTIS listing page if not already there
  const currentUrl = page.url();

  if (!currentUrl.includes('ntis.go.kr/rndgate/eg/un/ra/mng.do')) {
    // Establish session first (anti-bot measure)
    // Visit main NTIS page before accessing announcement listing
    if (!currentUrl.includes('ntis.go.kr')) {
      await page.goto('https://www.ntis.go.kr', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
    }

    // Navigate to announcement listing page
    await page.goto('https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
  }

  // Set start date using jQuery datepicker API
  // NOTE: Input fields are readonly and controlled by datepicker widget
  // Must use jQuery's datepicker('setDate') to properly set values
  await page.evaluate(
    ({ year, month, day }) => {
      const $ = (window as any).$;
      if (!$ || !$.datepicker) {
        throw new Error('jQuery Datepicker not available on page');
      }

      const startInput = $('#searchCondition2');
      if (!startInput.length || !startInput.datepicker) {
        throw new Error('Start date input #searchCondition2 not found');
      }

      // Set date (month is 0-indexed in JavaScript Date)
      startInput.datepicker('setDate', new Date(year, month - 1, day));
    },
    { year: from.year, month: from.month, day: from.day }
  );

  // Set end date using jQuery datepicker API
  await page.evaluate(
    ({ year, month, day }) => {
      const $ = (window as any).$;
      const endInput = $('#searchCondition3');
      if (!endInput.length || !endInput.datepicker) {
        throw new Error('End date input #searchCondition3 not found');
      }

      endInput.datepicker('setDate', new Date(year, month - 1, day));
    },
    { year: to.year, month: to.month, day: to.day }
  );

  await page.waitForTimeout(500);

  // Verify dates were set correctly (NEW - not in historical script)
  // This catches cases where datepicker API changed or form structure changed
  const actualDates = await page.evaluate(() => {
    const startInput = document.getElementById('searchCondition2') as HTMLInputElement;
    const endInput = document.getElementById('searchCondition3') as HTMLInputElement;
    return {
      startDate: startInput?.value || '',
      endDate: endInput?.value || '',
    };
  });

  // Normalize both actual and expected dates to YYYY-MM-DD format for comparison
  // (NTIS may use either YYYY.MM.DD or YYYY-MM-DD depending on context)
  const normalizeDate = (date: string) => date.replace(/\./g, '-');
  const expectedStart = normalizeDate(fromDate);
  const expectedEnd = normalizeDate(toDate);
  const actualStart = normalizeDate(actualDates.startDate);
  const actualEnd = normalizeDate(actualDates.endDate);

  if (actualStart !== expectedStart || actualEnd !== expectedEnd) {
    throw new Error(
      `Date filter verification failed:\n` +
      `  Expected: ${expectedStart} to ${expectedEnd}\n` +
      `  Actual: ${actualStart} to ${actualEnd}`
    );
  }

  // Set page index for pagination (if not page 1)
  if (pageNum > 1) {
    await page.evaluate((pageIndex) => {
      const pageInput = document.getElementById('pageIndex') as HTMLInputElement;
      if (pageInput) pageInput.value = String(pageIndex);
    }, pageNum);
  }

  // Submit form by calling NTIS's fn_search() function
  // NOTE: NTIS uses a custom fn_search('1', '') function, not standard form.submit()
  await page.evaluate((pNum) => {
    if (typeof (window as any).fn_search !== 'function') {
      throw new Error('NTIS fn_search() function not found');
    }
    (window as any).fn_search(String(pNum), '');
  }, pageNum);

  // Wait for filtered results to load after form submission
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 30000 });
}
