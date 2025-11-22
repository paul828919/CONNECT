/**
 * Unit Tests for Refund Calculator
 *
 * Tests refund calculation logic for monthly and annual subscriptions
 * Compliance: 전자상거래법 (Korean E-Commerce Act), 소비자분쟁해결기준
 */

import {
  calculateAnnualRefund,
  calculateMonthlyRefund,
  type RefundCalculation,
  type RefundMode,
} from '@/lib/refund-calculator';

describe('Refund Calculator', () => {
  describe('calculateAnnualRefund', () => {
    const ANNUAL_PRICE = 490_000; // ₩490,000

    describe('Within 7 days (Statutory Right)', () => {
      it('should return full refund on day 0 (purchase day)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-01-01'); // Same day

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.refundAmount).toBe(ANNUAL_PRICE);
        expect(result.usedDays).toBe(0);
        expect(result.penalty).toBe(0);
        expect(result.eligible).toBe(true);
        expect(result.mode).toBe('STATUTORY');
        expect(result.reason).toContain('7일 이내 전액 환불');
      });

      it('should return full refund on day 7 (last statutory day)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-01-08'); // Day 7

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.refundAmount).toBe(ANNUAL_PRICE);
        expect(result.usedDays).toBe(7);
        expect(result.penalty).toBe(0);
        expect(result.eligible).toBe(true);
        expect(result.mode).toBe('STATUTORY');
      });

      it('should return full refund within 7 days regardless of price', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-01-05'); // Day 4

        const testPrices = [49_000, 490_000, 990_000];

        testPrices.forEach((price) => {
          const result = calculateAnnualRefund(
            price,
            purchaseDate,
            contractEndDate,
            requestDate
          );

          expect(result.refundAmount).toBe(price);
          expect(result.penalty).toBe(0);
          expect(result.eligible).toBe(true);
        });
      });
    });

    describe('After 7 days (Contractual Refund with Penalty)', () => {
      it('should calculate pro-rated refund with 10% penalty on day 8', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2025-01-09'); // Day 8

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        const expectedUsedDays = 8;
        const expectedUsedAmount = Math.round((ANNUAL_PRICE / 365) * expectedUsedDays); // ~10,740
        const expectedRemainingAmount = ANNUAL_PRICE - expectedUsedAmount; // ~479,260
        const expectedPenalty = Math.round(expectedRemainingAmount * 0.1); // ~47,926
        const expectedRefund = ANNUAL_PRICE - expectedUsedAmount - expectedPenalty;

        expect(result.usedDays).toBe(expectedUsedDays);
        expect(result.usedAmount).toBe(expectedUsedAmount);
        expect(result.remainingAmount).toBe(expectedRemainingAmount);
        expect(result.penalty).toBe(expectedPenalty);
        expect(result.refundAmount).toBe(expectedRefund);
        expect(result.eligible).toBe(true);
        expect(result.mode).toBe('CONTRACTUAL');
      });

      it('should calculate correct refund at mid-contract (6 months)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2025-07-01'); // ~181 days

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        const expectedUsedDays = 181;
        const expectedUsedAmount = Math.round((ANNUAL_PRICE / 365) * expectedUsedDays); // ~242,904
        const expectedRemainingAmount = ANNUAL_PRICE - expectedUsedAmount; // ~247,096
        const expectedPenalty = Math.round(expectedRemainingAmount * 0.1); // ~24,710
        const expectedRefund = ANNUAL_PRICE - expectedUsedAmount - expectedPenalty;

        expect(result.usedDays).toBe(expectedUsedDays);
        expect(result.refundAmount).toBe(expectedRefund);
        expect(result.mode).toBe('CONTRACTUAL');
        expect(result.breakdown.calculation).toContain('위약금 10%');
      });

      it('should calculate correct refund near end of contract', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2025-12-25'); // Day 358

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.usedDays).toBe(358);
        expect(result.refundAmount).toBeGreaterThan(0);
        expect(result.eligible).toBe(true);
        expect(result.mode).toBe('CONTRACTUAL');
      });

      it('should return ₩0 refund at exact contract end', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2026-01-01'); // Day 365

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.usedDays).toBe(365);
        expect(result.refundAmount).toBe(0);
        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('환불 불가');
      });
    });

    describe('Statutory Mode (No Penalty)', () => {
      it('should apply no penalty when statutory option is true (service issue)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2025-07-01'); // ~181 days (6 months)

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate,
          { statutory: true } // ✅ No penalty
        );

        const expectedUsedDays = 181;
        const expectedUsedAmount = Math.round((ANNUAL_PRICE / 365) * expectedUsedDays); // ~242,904
        const expectedRefund = ANNUAL_PRICE - expectedUsedAmount; // ~247,096 (NO PENALTY)

        expect(result.penalty).toBe(0);
        expect(result.refundAmount).toBe(expectedRefund);
        expect(result.mode).toBe('STATUTORY');
        expect(result.reason).toContain('법정 계약해제');
        expect(result.breakdown.formula).toContain('no penalty');
      });

      it('should apply no penalty within 7 days (statutory always applies)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-01-05'); // Day 4

        // Even without explicit statutory flag, within 7 days should be full refund
        const resultWithoutFlag = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        const resultWithFlag = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate,
          { statutory: true }
        );

        expect(resultWithoutFlag.refundAmount).toBe(ANNUAL_PRICE);
        expect(resultWithFlag.refundAmount).toBe(ANNUAL_PRICE);
        expect(resultWithoutFlag.penalty).toBe(0);
        expect(resultWithFlag.penalty).toBe(0);
        expect(resultWithoutFlag.mode).toBe('STATUTORY');
        expect(resultWithFlag.mode).toBe('STATUTORY');
      });

      it('should use statutory mode for billing errors (after 7 days)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2025-03-01'); // ~59 days

        const normalRefund = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate,
          { statutory: false }
        );

        const statutoryRefund = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate,
          { statutory: true }
        );

        // Statutory should have higher refund (no penalty)
        expect(statutoryRefund.refundAmount).toBeGreaterThan(normalRefund.refundAmount);
        expect(statutoryRefund.penalty).toBe(0);
        expect(normalRefund.penalty).toBeGreaterThan(0);
      });
    });

    describe('Leap Year Handling', () => {
      it('should handle leap year contracts (366 days)', () => {
        const purchaseDate = new Date('2024-01-01'); // 2024 is a leap year
        const contractEndDate = new Date('2025-01-01'); // 366 days
        const requestDate = new Date('2024-07-01'); // Mid-contract

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.totalDays).toBe(366); // Leap year
        expect(result.usedDays).toBeGreaterThan(0);
        expect(result.usedDays).toBeLessThan(366);
        expect(result.refundAmount).toBeGreaterThan(0);
      });

      it('should calculate correct daily rate for leap year', () => {
        const purchaseDate = new Date('2024-01-01');
        const contractEndDate = new Date('2025-01-01'); // 366 days
        const requestDate = new Date('2024-01-09'); // Day 8

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        const expectedUsedAmount = Math.round((ANNUAL_PRICE / 366) * 8); // Different daily rate
        expect(result.usedAmount).toBe(expectedUsedAmount);
        expect(result.totalDays).toBe(366);
      });
    });

    describe('Edge Cases and Boundary Conditions', () => {
      it('should handle custom contract lengths (not exactly 365 days)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2025-07-01'); // 181 days (6 months)
        const requestDate = new Date('2025-04-01'); // ~90 days

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.totalDays).toBe(181);
        expect(result.usedDays).toBe(90);
        expect(result.refundAmount).toBeGreaterThan(0);
      });

      it('should clamp future request dates to totalDays', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2027-01-01'); // 1 year AFTER contract end

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        // Should clamp to contract end (365 days)
        expect(result.usedDays).toBe(365);
        expect(result.refundAmount).toBe(0);
      });

      it('should handle request before purchase date (negative days → clamped to 0)', () => {
        const purchaseDate = new Date('2025-01-10');
        const contractEndDate = new Date('2026-01-10');
        const requestDate = new Date('2025-01-05'); // 5 days BEFORE purchase

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        // Should clamp to 0 days
        expect(result.usedDays).toBe(0);
        expect(result.refundAmount).toBe(ANNUAL_PRICE); // Full refund (within 7 days)
      });

      it('should handle minimum contract length (1 day)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2025-01-02'); // 1 day contract
        const requestDate = new Date('2025-01-01'); // Same day

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.totalDays).toBe(1);
        expect(result.usedDays).toBe(0);
        expect(result.refundAmount).toBe(ANNUAL_PRICE);
      });

      it('should ensure refundAmount never goes negative', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-12-31'); // Day 364

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.refundAmount).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Breakdown and Metadata', () => {
      it('should include detailed calculation breakdown', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-07-01');

        const result = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.breakdown).toBeDefined();
        expect(result.breakdown.calculation).toBeTruthy();
        expect(result.breakdown.formula).toBeTruthy();
        expect(result.breakdown.calculation).toContain('₩');
      });

      it('should include correct refund mode metadata', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');

        // Within 7 days
        const earlyResult = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          new Date('2025-01-05')
        );
        expect(earlyResult.mode).toBe('STATUTORY');

        // After 7 days, normal
        const normalResult = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          new Date('2025-02-01')
        );
        expect(normalResult.mode).toBe('CONTRACTUAL');

        // After 7 days, statutory
        const statutoryResult = calculateAnnualRefund(
          ANNUAL_PRICE,
          purchaseDate,
          contractEndDate,
          new Date('2025-02-01'),
          { statutory: true }
        );
        expect(statutoryResult.mode).toBe('STATUTORY');
      });
    });

    describe('Real-world Scenarios', () => {
      it('should match example from refund policy page (6 months, ₩490,000)', () => {
        // From app/refund-policy/page.tsx:
        // Total: ₩490,000, Used: 6 months (181 days)
        // Expected: ~₩221,000 refund

        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01'); // 365 days
        const requestDate = new Date('2025-07-01'); // ~181 days

        const result = calculateAnnualRefund(
          490_000,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        // Used: ₩242,986 (181/365 × ₩490,000)
        // Remaining: ₩247,014
        // Penalty: ₩24,701 (10%)
        // Refund: ₩222,313
        expect(result.refundAmount).toBeCloseTo(222_313, -2); // Allow ±₩100 for rounding
      });

      it('should handle Pro plan annual pricing (₩490,000)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-04-01'); // Q1 end

        const result = calculateAnnualRefund(
          490_000,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.totalPaid).toBe(490_000);
        expect(result.refundAmount).toBeGreaterThan(0);
        expect(result.mode).toBe('CONTRACTUAL');
      });

      it('should handle Team plan annual pricing (₩990,000)', () => {
        const purchaseDate = new Date('2025-01-01');
        const contractEndDate = new Date('2026-01-01');
        const requestDate = new Date('2025-04-01');

        const result = calculateAnnualRefund(
          990_000,
          purchaseDate,
          contractEndDate,
          requestDate
        );

        expect(result.totalPaid).toBe(990_000);
        expect(result.refundAmount).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateMonthlyRefund', () => {
    const MONTHLY_PRICE = 49_000; // ₩49,000

    describe('First-time Goodwill Refund (7-day policy)', () => {
      it('should return full refund within 7 days with goodwill flag', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-05'); // Day 4

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.refundAmount).toBe(MONTHLY_PRICE);
        expect(result.penalty).toBe(0);
        expect(result.eligible).toBe(true);
        expect(result.mode).toBe('GOODWILL');
        expect(result.reason).toContain('1회 한정 정책');
      });

      it('should return full refund on day 0 (purchase day) with goodwill', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-01'); // Same day

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.refundAmount).toBe(MONTHLY_PRICE);
        expect(result.usedDays).toBe(0);
        expect(result.mode).toBe('GOODWILL');
      });

      it('should return full refund on day 7 (last goodwill day)', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-08'); // Day 7

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.refundAmount).toBe(MONTHLY_PRICE);
        expect(result.usedDays).toBe(7);
        expect(result.eligible).toBe(true);
      });
    });

    describe('No Refund After 7 Days (Standard Policy)', () => {
      it('should return ₩0 refund after 7 days (day 8)', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-09'); // Day 8

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true } // Even with goodwill flag, no refund after 7 days
        );

        expect(result.refundAmount).toBe(0);
        expect(result.eligible).toBe(false);
        expect(result.mode).toBe('CONTRACTUAL');
        expect(result.reason).toContain('월간 플랜 7일 경과');
      });

      it('should return ₩0 refund without goodwill flag (even within 7 days)', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-05'); // Day 4

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate
          // No goodwill flag
        );

        expect(result.refundAmount).toBe(0);
        expect(result.eligible).toBe(false);
        expect(result.mode).toBe('CONTRACTUAL');
      });

      it('should return ₩0 refund after 30 days (mid-month)', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-15'); // Day 14

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate
        );

        expect(result.refundAmount).toBe(0);
        expect(result.usedAmount).toBe(MONTHLY_PRICE);
        expect(result.eligible).toBe(false);
      });
    });

    describe('Edge Cases', () => {
      it('should handle different monthly pricing tiers', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-05');

        const prices = [49_000, 99_000, 149_000];

        prices.forEach((price) => {
          const result = calculateMonthlyRefund(
            price,
            purchaseDate,
            requestDate,
            { isFirstTimeGoodwill: true }
          );

          expect(result.refundAmount).toBe(price);
        });
      });

      it('should always use 30-day total for monthly plans', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-15');

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate
        );

        expect(result.totalDays).toBe(30);
      });

      it('should handle request before purchase date (clamp to 0 days)', () => {
        const purchaseDate = new Date('2025-01-10');
        const requestDate = new Date('2025-01-05'); // 5 days BEFORE

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.usedDays).toBe(0);
        expect(result.refundAmount).toBe(MONTHLY_PRICE);
      });
    });

    describe('Breakdown and Metadata', () => {
      it('should include detailed breakdown for goodwill refund', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-05');

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.breakdown).toBeDefined();
        expect(result.breakdown.calculation).toContain('전액 환불');
        expect(result.breakdown.calculation).toContain('1회 한정');
        expect(result.breakdown.formula).toContain('goodwill');
      });

      it('should include detailed breakdown for no refund', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-15');

        const result = calculateMonthlyRefund(
          MONTHLY_PRICE,
          purchaseDate,
          requestDate
        );

        expect(result.breakdown).toBeDefined();
        expect(result.breakdown.calculation).toContain('환불 불가');
        expect(result.breakdown.formula).toContain('No refund after 7 days');
      });
    });

    describe('Real-world Scenarios', () => {
      it('should match Pro monthly plan pricing (₩49,000)', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-05');

        const result = calculateMonthlyRefund(
          49_000,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.totalPaid).toBe(49_000);
        expect(result.refundAmount).toBe(49_000);
      });

      it('should handle Team monthly plan pricing (₩99,000)', () => {
        const purchaseDate = new Date('2025-01-01');
        const requestDate = new Date('2025-01-05');

        const result = calculateMonthlyRefund(
          99_000,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: true }
        );

        expect(result.totalPaid).toBe(99_000);
        expect(result.refundAmount).toBe(99_000);
      });

      it('should deny refund for second monthly purchase (no goodwill)', () => {
        // Simulating user who already used their one-time goodwill
        const purchaseDate = new Date('2025-02-01');
        const requestDate = new Date('2025-02-05');

        const result = calculateMonthlyRefund(
          49_000,
          purchaseDate,
          requestDate,
          { isFirstTimeGoodwill: false } // Second purchase, no goodwill
        );

        expect(result.refundAmount).toBe(0);
        expect(result.eligible).toBe(false);
      });
    });
  });

  describe('Type Safety and Return Value Structure', () => {
    it('should return all required fields for annual refund', () => {
      const purchaseDate = new Date('2025-01-01');
      const contractEndDate = new Date('2026-01-01');
      const requestDate = new Date('2025-06-01');

      const result = calculateAnnualRefund(
        490_000,
        purchaseDate,
        contractEndDate,
        requestDate
      );

      // Verify all fields exist
      expect(result).toHaveProperty('totalPaid');
      expect(result).toHaveProperty('usedDays');
      expect(result).toHaveProperty('totalDays');
      expect(result).toHaveProperty('usedAmount');
      expect(result).toHaveProperty('remainingAmount');
      expect(result).toHaveProperty('penalty');
      expect(result).toHaveProperty('refundAmount');
      expect(result).toHaveProperty('eligible');
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown).toHaveProperty('calculation');
      expect(result.breakdown).toHaveProperty('formula');

      // Verify types
      expect(typeof result.totalPaid).toBe('number');
      expect(typeof result.usedDays).toBe('number');
      expect(typeof result.totalDays).toBe('number');
      expect(typeof result.usedAmount).toBe('number');
      expect(typeof result.remainingAmount).toBe('number');
      expect(typeof result.penalty).toBe('number');
      expect(typeof result.refundAmount).toBe('number');
      expect(typeof result.eligible).toBe('boolean');
      expect(typeof result.mode).toBe('string');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.breakdown.calculation).toBe('string');
      expect(typeof result.breakdown.formula).toBe('string');
    });

    it('should return all required fields for monthly refund', () => {
      const purchaseDate = new Date('2025-01-01');
      const requestDate = new Date('2025-01-05');

      const result = calculateMonthlyRefund(
        49_000,
        purchaseDate,
        requestDate,
        { isFirstTimeGoodwill: true }
      );

      // Verify all fields exist (same as annual)
      expect(result).toHaveProperty('totalPaid');
      expect(result).toHaveProperty('usedDays');
      expect(result).toHaveProperty('totalDays');
      expect(result).toHaveProperty('usedAmount');
      expect(result).toHaveProperty('remainingAmount');
      expect(result).toHaveProperty('penalty');
      expect(result).toHaveProperty('refundAmount');
      expect(result).toHaveProperty('eligible');
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('breakdown');
    });

    it('should have valid RefundMode enum values', () => {
      const modes: RefundMode[] = ['STATUTORY', 'CONTRACTUAL', 'GOODWILL'];

      modes.forEach((mode) => {
        expect(['STATUTORY', 'CONTRACTUAL', 'GOODWILL']).toContain(mode);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should calculate annual refunds quickly (< 1ms per operation)', () => {
      const purchaseDate = new Date('2025-01-01');
      const contractEndDate = new Date('2026-01-01');
      const requestDate = new Date('2025-06-01');
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        calculateAnnualRefund(490_000, purchaseDate, contractEndDate, requestDate);
      }
      const elapsed = Date.now() - start;

      const avgTime = elapsed / iterations;
      expect(avgTime).toBeLessThan(1); // Pure calculation, should be sub-millisecond
    });

    it('should calculate monthly refunds quickly (< 1ms per operation)', () => {
      const purchaseDate = new Date('2025-01-01');
      const requestDate = new Date('2025-01-05');
      const iterations = 1000;

      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        calculateMonthlyRefund(49_000, purchaseDate, requestDate, { isFirstTimeGoodwill: true });
      }
      const elapsed = Date.now() - start;

      const avgTime = elapsed / iterations;
      expect(avgTime).toBeLessThan(1);
    });
  });
});
