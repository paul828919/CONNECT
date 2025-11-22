import { addMonths, addYears, isLeapYear } from 'date-fns';

/**
 * Calculates next billing date matching Toss Payments billing anchor logic.
 * Handles 30/31-day months, leap years.
 *
 * IMPORTANT: All dates use KST (Korea Standard Time, UTC+9) as standard.
 *
 * Legal rationale: Prevents misleading information claims (KFTC guidelines).
 * Server-side calculation ensures accuracy and consistency.
 *
 * @param params.planType - MONTHLY or ANNUAL
 * @param params.startDate - Subscription start date in KST (defaults to now in KST)
 * @returns nextBillingDate in KST and isEstimated flag
 */
export function calculateNextBillingDate(params: {
  planType: 'MONTHLY' | 'ANNUAL';
  startDate?: Date;
}): {
  nextBillingDate: Date;
  isEstimated: boolean;
} {
  const {
    planType,
    startDate = new Date() // Already in KST (system standard)
  } = params;

  // Use UTC methods to ensure timezone-independent calculations
  // This prevents off-by-one errors when running in different server timezones
  const dayOfMonth = startDate.getUTCDate();
  let nextDate: Date;

  if (planType === 'MONTHLY') {
    nextDate = addMonths(startDate, 1);

    // Handle 30/31-day issue (e.g., Jan 31 → Feb 28/29)
    if (nextDate.getUTCDate() !== dayOfMonth) {
      // Toss typically uses "last day of month" logic for overflow
      // Use UTC-aware last day calculation (Date.UTC with day 0 = last day of previous month)
      const year = nextDate.getUTCFullYear();
      const month = nextDate.getUTCMonth();
      nextDate = new Date(Date.UTC(year, month + 1, 0)); // Last day of current month
    }
  } else {
    // ANNUAL
    nextDate = addYears(startDate, 1);

    // Handle leap year edge case (Feb 29 → Feb 28 next year)
    if (
      isLeapYear(startDate) &&
      dayOfMonth === 29 &&
      startDate.getUTCMonth() === 1
    ) {
      const year = nextDate.getUTCFullYear();
      nextDate = new Date(Date.UTC(year, 1, 28)); // Feb 28
    }
  }

  return {
    nextBillingDate: nextDate,
    // Set to true if free trial or promotional period applies
    // For now, always false until we implement trials/promotions
    isEstimated: false,
  };
}

/**
 * Format billing cycle for user-facing display.
 * Converts database enum to Korean display text.
 *
 * @param planType - MONTHLY or ANNUAL
 * @returns Korean display text (e.g., "매월", "매년")
 */
export function formatBillingCycle(planType: 'MONTHLY' | 'ANNUAL'): string {
  return planType === 'MONTHLY' ? '매월' : '매년';
}

/**
 * Get date label based on estimation status.
 *
 * @param isEstimated - Whether the date is estimated
 * @returns Korean label text
 */
export function getDateLabel(isEstimated: boolean): string {
  return isEstimated ? '예상 결제일' : '다음 결제 예정일';
}
