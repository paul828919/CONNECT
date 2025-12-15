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

      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push(`/payments/success?subscriptionId=${chargeData.subscription?.id}&plan=${plan}`);
      }, 2000);
    } catch (err) {
      console.error('Payment processing error:', err);
      setError('결제 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  }, [authKey, customerKey, plan, billingCycle, amount, updateStep, updateSession, router]);

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

        {/* Success Message */}
        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-green-900 mb-1">결제가 완료되었습니다!</h3>
                <p className="text-sm text-green-700">
                  {getPlanName(plan)} 플랜이 활성화되었습니다. 잠시 후 결과 페이지로 이동합니다.
                </p>
              </div>
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
