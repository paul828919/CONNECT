'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Common Toss error codes and user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CARD_EXPIRATION: '카드 유효기간이 올바르지 않습니다.',
  INVALID_CARD_NUMBER: '카드 번호가 올바르지 않습니다.',
  INVALID_CARD_CVC: '카드 CVC가 올바르지 않습니다.',
  INVALID_CARD_INSTALLMENT_PLAN: '할부 정보가 올바르지 않습니다.',
  EXCEED_MAX_CARD_INSTALLMENT_PLAN: '할부 개월 수가 최대 한도를 초과했습니다.',
  INVALID_CUSTOMER_KEY: '고객 키가 올바르지 않습니다.',
  BELOW_MINIMUM_AMOUNT: '결제 금액이 최소 금액 미만입니다.',
  DUPLICATED_ORDER_ID: '중복된 주문번호입니다.',
  REJECT_CARD_COMPANY: '카드사에서 거절되었습니다.',
  REJECT_CARD_PAYMENT: '카드 결제가 거절되었습니다.',
  EXCEED_MAX_AMOUNT: '결제 금액이 최대 한도를 초과했습니다.',
  INVALID_PASSWORD: '비밀번호가 올바르지 않습니다.',
  RESTRICTED_CARD: '사용이 제한된 카드입니다.',
  FORBIDDEN_REQUEST: '허용되지 않은 요청입니다.',
  NOT_FOUND_PAYMENT: '결제 정보를 찾을 수 없습니다.',
  NOT_FOUND_BILLING_KEY: '빌링키를 찾을 수 없습니다.',
  NOT_AVAILABLE_PAYMENT: '결제가 불가능한 상태입니다.',
  FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING: '결제 처리 중 오류가 발생했습니다.',
  USER_CANCEL: '사용자가 결제를 취소했습니다.',
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
};

function BillingFailContent() {
  const searchParams = useSearchParams();

  const errorCode = searchParams.get('code') || 'UNKNOWN';
  const errorMessage = searchParams.get('message') || ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN;
  const plan = searchParams.get('plan');

  const getPlanName = (planKey: string | null) => {
    if (!planKey) return '플랜';
    return planKey === 'PRO' ? 'Pro' : 'Team';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-bold text-blue-600 mb-4">
            Connect
          </Link>

          {/* Error Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">결제 실패</h1>
          <p className="text-gray-600">{getPlanName(plan)} 플랜 결제가 완료되지 않았습니다.</p>
        </div>

        {/* Error Details */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">오류 내용</h3>
                <p className="text-sm text-red-700">{errorMessage}</p>
                {errorCode !== 'UNKNOWN' && errorCode !== 'USER_CANCEL' && (
                  <p className="text-xs text-red-500 mt-2">오류 코드: {errorCode}</p>
                )}
              </div>
            </div>
          </div>

          {/* Common Solutions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">해결 방법</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>카드 정보가 올바르게 입력되었는지 확인해 주세요.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>카드 한도가 충분한지 확인해 주세요.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>해외 결제 및 온라인 결제가 가능한 카드인지 확인해 주세요.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>문제가 지속되면 카드사에 문의해 주세요.</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <Link
              href="/pricing"
              className="block w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-center shadow-lg hover:shadow-xl transition-all"
            >
              다시 시도하기
            </Link>
            <Link
              href="/contact"
              className="block w-full py-4 px-6 rounded-xl bg-white border-2 border-gray-300 text-gray-700 font-semibold text-center hover:bg-gray-50 transition-all"
            >
              고객센터 문의
            </Link>
          </div>
        </div>

        {/* Support Info */}
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            결제에 문제가 있으시면 고객센터로 연락해 주세요.
          </p>
          <p>
            📧 support@connectplt.kr
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingFailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <BillingFailContent />
    </Suspense>
  );
}
