'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'failed';
  error?: string;
}

function BillingSuccessContent() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'auth', label: '결제 인증 확인', status: 'pending' },
    { id: 'billing_key', label: '빌링키 발급', status: 'pending' },
    { id: 'charge', label: '첫 결제 처리', status: 'pending' },
    { id: 'activation', label: '구독 활성화', status: 'pending' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Parse query parameters
  const authKey = searchParams.get('authKey');
  const customerKey = searchParams.get('customerKey');
  const plan = searchParams.get('plan') as 'PRO' | 'TEAM' | null;
  const billingCycle = searchParams.get('billingCycle') as 'MONTHLY' | 'ANNUAL' | null;
  const amount = searchParams.get('amount');

  const updateStep = useCallback((stepId: string, status: ProcessingStep['status'], error?: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, error } : step
      )
    );
  }, []);

  const processPayment = useCallback(async () => {
    if (!authKey || !customerKey || !plan || !billingCycle || !amount) {
      setError('결제 정보가 올바르지 않습니다. 다시 시도해 주세요.');
      return;
    }

    try {
      // Step 1: Auth verification (already done by redirect)
      updateStep('auth', 'completed');

      // Step 2: Issue billing key
      updateStep('billing_key', 'loading');

      const issueResponse = await fetch('/api/billing/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey, customerKey }),
      });

      const issueData = await issueResponse.json();

      if (!issueResponse.ok) {
        updateStep('billing_key', 'failed', issueData.message || '빌링키 발급 실패');
        setError(issueData.message || '빌링키 발급에 실패했습니다.');
        return;
      }

      updateStep('billing_key', 'completed');

      // Step 3: Charge first payment
      updateStep('charge', 'loading');

      const chargeResponse = await fetch('/api/billing/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingKey: issueData.billingKey,
          customerKey,
          amount: parseInt(amount),
          plan,
          billingCycle,
        }),
      });

      const chargeData = await chargeResponse.json();

      if (!chargeResponse.ok) {
        updateStep('charge', 'failed', chargeData.message || '결제 처리 실패');
        setError(chargeData.message || '결제 처리에 실패했습니다.');
        return;
      }

      updateStep('charge', 'completed');

      // Step 4: Subscription activation
      updateStep('activation', 'loading');

      // Update session to reflect new subscription
      await updateSession();

      updateStep('activation', 'completed');
      setSubscriptionId(chargeData.subscription?.id);
      setIsComplete(true);

      // No redirect - show inline success UI instead
      // This eliminates the double-redirect pattern that causes UI instability
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  }, [authKey, customerKey, plan, billingCycle, amount, updateStep, updateSession]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!session) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href));
      return;
    }

    // Start payment processing
    processPayment();
  }, [session, sessionStatus, router, processPayment]);

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const getPlanName = (planKey: string | null) => {
    if (!planKey) return '플랜';
    return planKey === 'PRO' ? 'Pro' : 'Team';
  };

  const formatAmount = (amountStr: string | null) => {
    if (!amountStr) return '0';
    return new Intl.NumberFormat('ko-KR').format(parseInt(amountStr));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-3xl font-bold text-blue-600 mb-4">
            Connect
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isComplete ? '결제 완료!' : '결제 처리 중...'}
          </h1>
          <p className="text-gray-600">
            {isComplete
              ? '잠시 후 결과 페이지로 이동합니다.'
              : `${getPlanName(plan)} 플랜 (₩${formatAmount(amount)})`}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4">
                {/* Step indicator */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'completed'
                    ? 'bg-green-100 text-green-600'
                    : step.status === 'loading'
                    ? 'bg-blue-100 text-blue-600'
                    : step.status === 'failed'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.status === 'loading' ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : step.status === 'failed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Step label */}
                <div className="flex-1">
                  <p className={`font-medium ${
                    step.status === 'completed'
                      ? 'text-green-700'
                      : step.status === 'loading'
                      ? 'text-blue-700'
                      : step.status === 'failed'
                      ? 'text-red-700'
                      : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.error && (
                    <p className="text-sm text-red-500 mt-1">{step.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">결제 오류</h3>
                <p className="text-sm text-red-700">{error}</p>
                <Link
                  href="/pricing"
                  className="inline-block mt-3 text-sm text-red-600 hover:text-red-800 underline"
                >
                  플랜 선택으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Success Message - Expanded inline UI */}
        {isComplete && (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-green-900 text-center mb-2">결제가 완료되었습니다!</h3>
              <p className="text-green-700 text-center">
                {getPlanName(plan)} 플랜이 성공적으로 활성화되었습니다.
              </p>
            </div>

            {/* Plan Features */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-900 mb-4 text-center">
                🎉 이제 다음 기능을 이용할 수 있습니다
              </h4>
              <div className="space-y-3">
                {plan === 'PRO' ? (
                  <>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>무제한 매칭 생성</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>상세 매칭 설명</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>실시간 업데이트</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>우선 기술 지원</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Pro 플랜의 모든 기능</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>최대 5명 팀 멤버</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>무제한 Warm Intro</span>
                    </div>
                    <div className="flex items-center gap-3 text-blue-800">
                      <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>전담 고객 성공 매니저</span>
                    </div>
                  </>
                )}
              </div>
              {subscriptionId && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="text-sm text-blue-600 text-center">
                    구독 ID: <span className="font-mono">{subscriptionId}</span>
                  </p>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold transition-all"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                대시보드로 이동
              </Link>
              <Link
                href="/dashboard/matches"
                className="flex-1 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-all"
              >
                <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                매칭 생성하기
              </Link>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <p className="mb-2">
            🔒 모든 결제 정보는 토스페이먼츠를 통해 안전하게 처리됩니다
          </p>
        </div>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
