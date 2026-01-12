'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Toss Payments SDK v2 types
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

interface TossPaymentsInstance {
  payment: (options: { customerKey: string }) => TossPaymentWidget;
}

interface TossPaymentWidget {
  requestBillingAuth: (options: BillingAuthOptions) => Promise<void>;
}

interface BillingAuthOptions {
  method: 'CARD';
  successUrl: string;
  failUrl: string;
  customerEmail?: string;
  customerName?: string;
}

interface TossBillingWidgetProps {
  plan: 'PRO' | 'TEAM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amount: number;
  onError?: (error: Error) => void;
}

// Plan prices for validation (must match pricing page and billing APIs)
const PLAN_PRICES = {
  PRO: { MONTHLY: 20900, ANNUAL: 490000 },   // MONTHLY: VAT-inclusive (₩19,000 + ₩1,900)
  TEAM: { MONTHLY: 62700, ANNUAL: 990000 },  // MONTHLY: VAT-inclusive (₩57,000 + ₩5,700)
};

export function TossBillingWidget({
  plan,
  billingCycle,
  amount,
  onError,
}: TossBillingWidgetProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [customerKey, setCustomerKey] = useState<string | null>(null);
  const [customerKeyLoading, setCustomerKeyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Toss Payments SDK v2
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.TossPayments) {
      const script = document.createElement('script');
      script.src = 'https://js.tosspayments.com/v2/standard';
      script.async = true;
      script.onload = () => {
        setSdkLoaded(true);
      };
      script.onerror = () => {
        setError('결제 모듈을 불러오는데 실패했습니다.');
      };
      document.head.appendChild(script);
    } else if (window.TossPayments) {
      setSdkLoaded(true);
    }
  }, []);

  // Fetch customerKey from server (stored in database, not localStorage)
  // This ensures consistency across devices and browser cache clears
  const fetchCustomerKey = useCallback(async () => {
    if (customerKey || customerKeyLoading) return;

    setCustomerKeyLoading(true);
    try {
      const response = await fetch('/api/billing/customer-key');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'customerKey 조회에 실패했습니다.');
      }

      setCustomerKey(data.customerKey);
    } catch (err) {
      console.error('Failed to fetch customerKey:', err);
      setError(err instanceof Error ? err.message : 'customerKey 조회에 실패했습니다.');
    } finally {
      setCustomerKeyLoading(false);
    }
  }, [customerKey, customerKeyLoading]);

  // Fetch customerKey when session is available
  useEffect(() => {
    if (session?.user && !customerKey && !customerKeyLoading) {
      fetchCustomerKey();
    }
  }, [session, customerKey, customerKeyLoading, fetchCustomerKey]);

  const handleBillingAuth = async () => {
    if (!sdkLoaded || !window.TossPayments) {
      setError('결제 모듈이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!session?.user) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (!customerKey) {
      setError('결제 준비 중입니다. 잠시 후 다시 시도해주세요.');
      // Try to fetch customerKey again
      await fetchCustomerKey();
      return;
    }

    // Validate amount matches expected plan price
    const expectedAmount = PLAN_PRICES[plan][billingCycle];
    if (amount !== expectedAmount) {
      console.error('Amount mismatch:', { amount, expectedAmount });
      setError('결제 금액이 올바르지 않습니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

      if (!clientKey) {
        throw new Error('결제 설정이 완료되지 않았습니다.');
      }

      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey });

      // Build success/fail URLs with plan info
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/billing/success?plan=${plan}&billingCycle=${billingCycle}&amount=${amount}`;
      const failUrl = `${baseUrl}/billing/fail?plan=${plan}`;

      // Request billing authorization
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl,
        failUrl,
        customerEmail: session.user.email || undefined,
        customerName: session.user.name || undefined,
      });

      // Note: requestBillingAuth will redirect the user to Toss payment window
      // After successful auth, user will be redirected to successUrl
      // After failed auth, user will be redirected to failUrl
    } catch (err) {
      console.error('Billing auth error:', err);
      const errorMessage = err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle click - always use real Toss SDK
  // Note: Test mode (NEXT_PUBLIC_TOSS_TEST_MODE=true) affects Toss SDK behavior:
  // - SMS verification: enter 000000 instead of real code
  // - Card validation: only BIN (first 6 digits) needs to be valid
  // - No actual charges are made
  // But the SDK still opens the card registration UI for proper testing
  const handleClick = () => {
    handleBillingAuth();
  };

  const isReady = sdkLoaded && customerKey && !customerKeyLoading;

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading || !isReady}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
          isLoading || !isReady
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            처리 중...
          </span>
        ) : !sdkLoaded ? (
          '결제 모듈 로딩 중...'
        ) : customerKeyLoading ? (
          '결제 준비 중...'
        ) : (
          <>
            <svg className="inline-block h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            카드 등록 및 결제하기
          </>
        )}
      </button>

      {process.env.NEXT_PUBLIC_TOSS_TEST_MODE === 'true' && (
        <p className="mt-2 text-xs text-center text-yellow-600">
          테스트 모드: 실제 결제가 진행되지 않습니다
        </p>
      )}
    </div>
  );
}

export default TossBillingWidget;
