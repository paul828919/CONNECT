'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function TestCheckoutContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('orderId');
  const plan = searchParams.get('plan');
  const amount = searchParams.get('amount');
  const billingCycle = searchParams.get('billingCycle') || 'MONTHLY';

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    if (!orderId || !plan || !amount) {
      setError('잘못된 결제 요청입니다.');
    }
  }, [session, status, router, orderId, plan, amount]);

  const handleCompletePayment = async () => {
    if (!orderId || !plan || !amount) {
      setError('결제 정보가 누락되었습니다.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch('/api/payments/checkout/success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          plan,
          amount: parseInt(amount),
          billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '결제 처리 중 오류가 발생했습니다.');
        return;
      }

      // Success! Redirect to success page
      router.push(`/payments/success?subscriptionId=${data.subscription.id}&plan=${plan}`);
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect
  }

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('ko-KR').format(parseInt(price));
  };

  const getPlanName = (planKey: string) => {
    const plans: Record<string, string> = {
      PRO: 'Pro 플랜',
      TEAM: 'Team 플랜',
    };
    return plans[planKey] || planKey;
  };

  const getBillingCycleName = (cycle: string) => {
    return cycle === 'ANNUAL' ? '연간 결제' : '월간 결제';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-bold text-blue-600 mb-4">
            Connect
          </Link>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            테스트 결제 페이지
          </h1>
          <p className="text-gray-600">
            실제 결제가 진행되지 않는 테스트 모드입니다
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Test Mode Banner */}
        <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">테스트 모드</h3>
              <p className="text-sm text-yellow-700">
                실제 카드 결제가 진행되지 않습니다. &ldquo;결제 완료&rdquo; 버튼을 클릭하면 즉시 구독이 활성화됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b">
            주문 정보
          </h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">플랜</span>
              <span className="font-semibold text-gray-900">
                {plan ? getPlanName(plan) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">결제 주기</span>
              <span className="font-semibold text-gray-900">
                {getBillingCycleName(billingCycle)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">주문 번호</span>
              <span className="font-mono text-sm text-gray-700">{orderId}</span>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-semibold text-gray-900">총 결제 금액</span>
              <span className="text-2xl font-bold text-blue-600">
                ₩{amount ? formatPrice(amount) : '0'}
              </span>
            </div>

            {/* Payment Method Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-gray-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">
                    테스트 결제 방식
                  </h4>
                  <p className="text-sm text-gray-600">
                    실제 결제가 진행되지 않습니다. 아래 버튼을 클릭하면 테스트 구독이 즉시 활성화됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Complete Payment Button */}
            <button
              onClick={handleCompletePayment}
              disabled={processing || !!error}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
                processing || error
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
              }`}
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  처리 중...
                </span>
              ) : (
                <>
                  <svg className="inline-block h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  결제 완료
                </>
              )}
            </button>

            {/* Cancel Link */}
            <div className="text-center mt-4">
              <Link
                href="/pricing"
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                결제 취소하고 플랜 선택으로 돌아가기
              </Link>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            🔒 테스트 환경에서는 실제 결제가 진행되지 않습니다
          </p>
          <p>
            본 서비스는 토스페이먼츠를 통해 안전하게 처리됩니다
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TestCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <TestCheckoutContent />
    </Suspense>
  );
}
