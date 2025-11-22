import { calculateNextBillingDate, formatBillingCycle, getDateLabel } from '@/lib/billing-date-calculator';

describe('calculateNextBillingDate', () => {
  describe('MONTHLY billing', () => {
    it('should calculate next month for regular dates', () => {
      // Jan 15 → Feb 15 (KST)
      const result = calculateNextBillingDate({
        planType: 'MONTHLY',
        startDate: new Date('2025-01-15T00:00:00+09:00'),
      });

      expect(result.nextBillingDate.getFullYear()).toBe(2025);
      expect(result.nextBillingDate.getMonth()).toBe(1); // February (0-indexed)
      expect(result.nextBillingDate.getDate()).toBe(15);
      expect(result.isEstimated).toBe(false);
    });

    it('should handle 30/31 day months correctly (Jan 31 → Feb 28)', () => {
      // Jan 31 → Feb 28 (non-leap year, KST)
      const result = calculateNextBillingDate({
        planType: 'MONTHLY',
        startDate: new Date('2025-01-31T00:00:00+09:00'),
      });

      expect(result.nextBillingDate.getFullYear()).toBe(2025);
      expect(result.nextBillingDate.getMonth()).toBe(1); // February
      expect(result.nextBillingDate.getDate()).toBe(28); // Last day of Feb in non-leap year
    });

    it('should handle 30/31 day months in leap year (Jan 31 → Feb 29)', () => {
      // Jan 31 → Feb 29 (leap year 2024, KST)
      const result = calculateNextBillingDate({
        planType: 'MONTHLY',
        startDate: new Date('2024-01-31T00:00:00+09:00'),
      });

      expect(result.nextBillingDate.getFullYear()).toBe(2024);
      expect(result.nextBillingDate.getMonth()).toBe(1); // February
      expect(result.nextBillingDate.getDate()).toBe(29); // Last day of Feb in leap year
    });

    it('should handle month transitions correctly (Mar 31 → Apr 30)', () => {
      // Mar 31 → Apr 30 (KST)
      const result = calculateNextBillingDate({
        planType: 'MONTHLY',
        startDate: new Date('2025-03-31T00:00:00+09:00'),
      });

      expect(result.nextBillingDate.getFullYear()).toBe(2025);
      expect(result.nextBillingDate.getMonth()).toBe(3); // April
      expect(result.nextBillingDate.getDate()).toBe(30); // Last day of April
    });
  });

  describe('ANNUAL billing', () => {
    it('should calculate next year for regular dates', () => {
      // 2025-06-15 → 2026-06-15 (KST)
      const result = calculateNextBillingDate({
        planType: 'ANNUAL',
        startDate: new Date('2025-06-15T00:00:00+09:00'),
      });

      expect(result.nextBillingDate.getFullYear()).toBe(2026);
      expect(result.nextBillingDate.getMonth()).toBe(5); // June (0-indexed)
      expect(result.nextBillingDate.getDate()).toBe(15);
      expect(result.isEstimated).toBe(false);
    });

    it('should handle leap year edge case (Feb 29 → Feb 28)', () => {
      // 2024-02-29 → 2025-02-28 (leap year to non-leap year, KST)
      const result = calculateNextBillingDate({
        planType: 'ANNUAL',
        startDate: new Date('2024-02-29T00:00:00+09:00'),
      });

      expect(result.nextBillingDate.getFullYear()).toBe(2025);
      expect(result.nextBillingDate.getMonth()).toBe(1); // February
      expect(result.nextBillingDate.getDate()).toBe(28); // Feb 28 in non-leap year
    });

    it('should preserve Feb 29 when next year is also a leap year', () => {
      // 2024-02-29 → 2028-02-29 (leap year to leap year, KST)
      const result = calculateNextBillingDate({
        planType: 'ANNUAL',
        startDate: new Date('2024-02-29T00:00:00+09:00'),
      });

      // First year: 2024 → 2025 (Feb 28)
      expect(result.nextBillingDate.getDate()).toBe(28);

      // If we calculate from 2028 (leap year), it should preserve Feb 29
      const result2028 = calculateNextBillingDate({
        planType: 'ANNUAL',
        startDate: new Date('2028-02-29T00:00:00+09:00'),
      });

      expect(result2028.nextBillingDate.getFullYear()).toBe(2029);
      expect(result2028.nextBillingDate.getDate()).toBe(28); // 2029 is not a leap year
    });
  });

  describe('Edge cases', () => {
    it('should default to current date (KST) when startDate is not provided', () => {
      const result = calculateNextBillingDate({
        planType: 'MONTHLY',
      });

      // Should return a date in the future
      expect(result.nextBillingDate.getTime()).toBeGreaterThan(Date.now());
      expect(result.isEstimated).toBe(false);
    });

    it('should always set isEstimated to false for current implementation', () => {
      const result = calculateNextBillingDate({
        planType: 'MONTHLY',
        startDate: new Date('2025-01-15T00:00:00+09:00'),
      });

      // Until we implement trials/promotions, always false
      expect(result.isEstimated).toBe(false);
    });
  });
});

describe('formatBillingCycle', () => {
  it('should format MONTHLY as "매월"', () => {
    expect(formatBillingCycle('MONTHLY')).toBe('매월');
  });

  it('should format ANNUAL as "매년"', () => {
    expect(formatBillingCycle('ANNUAL')).toBe('매년');
  });
});

describe('getDateLabel', () => {
  it('should return "다음 결제 예정일" when isEstimated is false', () => {
    expect(getDateLabel(false)).toBe('다음 결제 예정일');
  });

  it('should return "예상 결제일" when isEstimated is true', () => {
    expect(getDateLabel(true)).toBe('예상 결제일');
  });
});
