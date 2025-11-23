/**
 * Refund Calculator
 * Calculates refund amounts for monthly and annual subscriptions
 * Compliant with Korean e-commerce law and internal policy
 */

const DAY_MS = 1000 * 60 * 60 * 24;

export type RefundMode = 'STATUTORY' | 'CONTRACTUAL' | 'GOODWILL';

export interface RefundCalculation {
  totalPaid: number;
  usedDays: number;
  totalDays: number;
  usedAmount: number;
  remainingAmount: number;
  penalty: number;
  refundAmount: number;
  eligible: boolean;
  mode: RefundMode;
  reason: string;
  breakdown: {
    calculation: string;
    formula: string;
  };
}

/**
 * Calculate refund for ANNUAL subscriptions
 *
 * @param totalPaid - Total amount paid in KRW
 * @param purchaseDate - Contract start date
 * @param contractEndDate - Contract end date (for accurate day calculation)
 * @param requestDate - Refund request date (defaults to now)
 * @param options - { statutory?: boolean } - If true, no penalty applied
 */
export function calculateAnnualRefund(
  totalPaid: number,
  purchaseDate: Date,
  contractEndDate: Date,
  requestDate: Date = new Date(),
  options?: { statutory?: boolean }
): RefundCalculation {

  // ✅ FIX 1: Use actual contract days (handles leap years, custom terms)
  const totalDays = Math.max(
    1,
    Math.round((contractEndDate.getTime() - purchaseDate.getTime()) / DAY_MS)
  );

  // ✅ FIX 2: Clamp usedDays to prevent negative/overflow
  const rawUsedDays = Math.floor(
    (requestDate.getTime() - purchaseDate.getTime()) / DAY_MS
  );
  const usedDays = Math.min(totalDays, Math.max(0, rawUsedDays));

  // Within 7 days: full refund (statutory right)
  if (usedDays <= 7) {
    return {
      totalPaid,
      usedDays,
      totalDays,
      usedAmount: 0,
      remainingAmount: totalPaid,
      penalty: 0,
      refundAmount: totalPaid,
      eligible: true,
      mode: 'STATUTORY',
      reason: '7일 이내 전액 환불 (법정 청약철회권)',
      breakdown: {
        calculation: `전액 환불: ₩${totalPaid.toLocaleString()}`,
        formula: 'Within 7 days = Full refund (statutory)'
      }
    };
  }

  // ✅ FIX 3: Statutory mode (no penalty even after 7 days)
  if (options?.statutory === true) {
    const usedAmount = Math.round((totalPaid / totalDays) * usedDays);
    const refundAmount = Math.max(0, totalPaid - usedAmount);

    return {
      totalPaid,
      usedDays,
      totalDays,
      usedAmount,
      remainingAmount: totalPaid - usedAmount,
      penalty: 0,
      refundAmount,
      eligible: refundAmount > 0,
      mode: 'STATUTORY',
      reason: '법정 계약해제 (사업자 귀책)',
      breakdown: {
        calculation: `총액(₩${totalPaid.toLocaleString()}) - 사용분(₩${usedAmount.toLocaleString()}) = ₩${refundAmount.toLocaleString()}`,
        formula: 'Statutory cancellation = Total - Used (no penalty)'
      }
    };
  }

  // After 7 days: contractual refund with 10% penalty
  const usedAmount = Math.round((totalPaid / totalDays) * usedDays);
  const remainingAmount = totalPaid - usedAmount;
  const penalty = Math.round(remainingAmount * 0.1); // 10% of remaining
  const refundAmount = Math.max(0, totalPaid - usedAmount - penalty);

  return {
    totalPaid,
    usedDays,
    totalDays,
    usedAmount,
    remainingAmount,
    penalty,
    refundAmount,
    eligible: refundAmount > 0,
    mode: 'CONTRACTUAL',
    reason: refundAmount > 0
      ? '일할 계산 + 10% 위약금 차감'
      : '계산 결과 환불 불가 (사용기간 경과)',
    breakdown: {
      calculation: `₩${totalPaid.toLocaleString()} - ₩${usedAmount.toLocaleString()} (사용) - ₩${penalty.toLocaleString()} (위약금 10%) = ₩${refundAmount.toLocaleString()}`,
      formula: 'Total - (Total × UsedDays / TotalDays) - (Remaining × 10%)'
    }
  };
}

/**
 * Calculate refund for MONTHLY subscriptions
 *
 * @param totalPaid - Total amount paid in KRW
 * @param purchaseDate - Contract start date
 * @param requestDate - Refund request date (defaults to now)
 * @param options - { isFirstTimeGoodwill?: boolean } - If true, 7-day full refund applies
 */
export function calculateMonthlyRefund(
  totalPaid: number,
  purchaseDate: Date,
  requestDate: Date = new Date(),
  options?: { isFirstTimeGoodwill?: boolean }
): RefundCalculation {

  const usedDays = Math.max(0, Math.floor(
    (requestDate.getTime() - purchaseDate.getTime()) / DAY_MS
  ));

  // Within 7 days + first-time goodwill: full refund (one-time only)
  if (usedDays <= 7 && options?.isFirstTimeGoodwill === true) {
    return {
      totalPaid,
      usedDays,
      totalDays: 30,
      usedAmount: 0,
      remainingAmount: totalPaid,
      penalty: 0,
      refundAmount: totalPaid,
      eligible: true,
      mode: 'GOODWILL',
      reason: '7일 이내 전액 환불 (1회 한정 정책)',
      breakdown: {
        calculation: `전액 환불: ₩${totalPaid.toLocaleString()} (1회 한정)`,
        formula: 'Monthly plan: 7-day goodwill refund (one-time)'
      }
    };
  }

  // After 7 days: no refund (standard term)
  return {
    totalPaid,
    usedDays,
    totalDays: 30,
    usedAmount: totalPaid,
    remainingAmount: 0,
    penalty: 0,
    refundAmount: 0,
    eligible: false,
    mode: 'CONTRACTUAL',
    reason: '월간 플랜 7일 경과 (법정 권리 제외 환불 불가)',
    breakdown: {
      calculation: '환불 불가 (표준 약관)',
      formula: 'Monthly plan: No refund after 7 days (except statutory)'
    }
  };
}

/**
 * Unified refund calculator
 * Automatically detects plan type and applies correct calculation logic
 */
export interface RefundCalculationParams {
  totalPaid: number;
  startDate: Date;
  requestDate: Date;
  contractEndDate: Date;
  isAnnualPlan: boolean;
  mode?: 'statutory' | 'contractual';
}

export function calculateRefund(params: RefundCalculationParams): RefundCalculation {
  const { totalPaid, startDate, requestDate, contractEndDate, isAnnualPlan, mode } = params;

  if (isAnnualPlan) {
    return calculateAnnualRefund(
      totalPaid,
      startDate,
      contractEndDate,
      requestDate,
      { statutory: mode === 'statutory' }
    );
  } else {
    return calculateMonthlyRefund(
      totalPaid,
      startDate,
      requestDate,
      { isFirstTimeGoodwill: mode === 'statutory' }
    );
  }
}
