'use client';

import Link from 'next/link';

export type BillingStatus = 'active' | 'past_due' | 'card_expiring';

interface BillingStatusBannerProps {
  status: BillingStatus;
  retryCount?: number;
  nextRetryDate?: Date;
}

/**
 * BillingStatusBanner Component
 *
 * Displays a warning/error banner based on billing status:
 * - 'past_due': Payment failed, subscription at risk
 * - 'card_expiring': Card expiring soon, prompt update
 * - 'active': No banner displayed
 */
export function BillingStatusBanner({
  status,
  retryCount = 0,
  nextRetryDate,
}: BillingStatusBannerProps) {
  if (status === 'active') {
    return null;
  }

  if (status === 'past_due') {
    return (
      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">
              결제에 실패하여 구독이 일시 중단되었습니다
            </h3>
            <p className="text-sm text-red-700 mt-1">
              등록된 카드로 결제할 수 없습니다. 서비스를 계속 이용하시려면
              결제 수단을 변경해주세요.
            </p>
            {retryCount > 0 && (
              <p className="text-xs text-red-600 mt-2">
                재시도 횟수: {retryCount}/3회
                {nextRetryDate && (
                  <span className="ml-2">
                    (다음 재시도: {nextRetryDate.toLocaleDateString('ko-KR')})
                  </span>
                )}
              </p>
            )}
            <Link
              href="/dashboard/billing/update"
              className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              결제 수단 변경하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'card_expiring') {
    return (
      <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">
              등록된 카드가 곧 만료됩니다
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              원활한 서비스 이용을 위해 결제 수단을 업데이트해 주세요.
              카드 만료 시 자동 결제가 실패할 수 있습니다.
            </p>
            <Link
              href="/dashboard/billing/update"
              className="inline-flex items-center gap-1 mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              결제 수단 업데이트
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * PaymentMethodUpdateLink Component
 *
 * A simple link/button to navigate to payment method update page.
 * For use in subscription management areas.
 */
export function PaymentMethodUpdateLink() {
  return (
    <Link
      href="/dashboard/billing/update"
      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
      결제 수단 변경
    </Link>
  );
}
