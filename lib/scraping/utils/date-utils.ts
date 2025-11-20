/**
 * Date utilities for NTIS scraping with Asia/Seoul timezone handling
 */

/**
 * Get date range for daily NTIS scraping
 * Returns last N calendar days (default: 2 days for yesterday + today)
 *
 * @param daysBack Number of days to look back from today (default: 2)
 * @returns Object with fromDate and toDate in YYYY-MM-DD format
 *
 * @example
 * // If today is Oct 26, 2025
 * getDailyScrapeDateRange(2)
 * // Returns { fromDate: '2025-10-24', toDate: '2025-10-26' }
 */
export function getDailyScrapeDateRange(daysBack: number = 2): {
  fromDate: string; // YYYY-MM-DD format
  toDate: string;   // YYYY-MM-DD format
} {
  // Get current date in Korea timezone (Asia/Seoul)
  // IMPORTANT: Avoid server timezone issues by explicitly using KST
  const nowKST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  );

  // Calculate start date (N days back from today)
  const startDate = new Date(nowKST);
  startDate.setDate(nowKST.getDate() - daysBack);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    fromDate: formatDate(startDate),
    toDate: formatDate(nowKST),
  };
}

/**
 * Get "yesterday to today" date range for daily NTIS scraping
 * Based on KST (Asia/Seoul) timezone
 *
 * @returns Object with fromDate (yesterday) and toDate (today) in YYYY-MM-DD format
 *
 * @example
 * // If today is Oct 26, 2025 in KST
 * getYesterdayToTodayRange()
 * // Returns { fromDate: '2025-10-25', toDate: '2025-10-26' }
 */
export function getYesterdayToTodayRange(): {
  fromDate: string; // YYYY-MM-DD format
  toDate: string;   // YYYY-MM-DD format
} {
  // Get current date in Korea timezone (Asia/Seoul)
  const nowKST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
  );

  // Calculate yesterday
  const yesterdayKST = new Date(nowKST);
  yesterdayKST.setDate(nowKST.getDate() - 1);

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    fromDate: formatDate(yesterdayKST),
    toDate: formatDate(nowKST),
  };
}

/**
 * Validate YYYY-MM-DD date string and convert to Date object components
 * Throws error if invalid or auto-corrected (e.g., Feb 31 → Mar 3)
 *
 * @param dateStr Date string in YYYY-MM-DD format
 * @returns Object with year, month, day components and JavaScript Date object
 * @throws Error if date format is invalid or auto-corrected
 *
 * @example
 * validateAndParseDate('2025-10-26')
 * // Returns { year: 2025, month: 10, day: 26, jsDate: Date(...) }
 *
 * validateAndParseDate('2025-02-31')
 * // Throws: "Invalid date 2025-02-31 auto-corrected to 2025-03-03"
 */
export function validateAndParseDate(dateStr: string): {
  year: number;
  month: number;
  day: number;
  jsDate: Date;
} {
  const parts = dateStr.split('-').map(Number);

  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr} (expected YYYY-MM-DD)`);
  }

  const [year, month, day] = parts;

  // Validate components exist and are in valid ranges
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  // Create JavaScript Date (month is 0-indexed in JS)
  const jsDate = new Date(year, month - 1, day);

  // Verify JavaScript didn't auto-correct the date
  // Example: new Date(2025, 1, 31) becomes Mar 3, 2025
  if (
    jsDate.getFullYear() !== year ||
    jsDate.getMonth() !== month - 1 ||
    jsDate.getDate() !== day
  ) {
    throw new Error(
      `Invalid date ${dateStr} auto-corrected to ${jsDate.toISOString().split('T')[0]}`
    );
  }

  return { year, month, day, jsDate };
}
