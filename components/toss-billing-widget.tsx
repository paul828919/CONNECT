'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';

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

// Plan prices for validation
const PLAN_PRICES = {
  PRO: { MONTHLY: 49000, ANNUAL: 490000 },
  TEAM: { MONTHLY: 99000, ANNUAL: 990000 },
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

  // Generate or retrieve customerKey
  const getCustomerKey = useCallback((): string => {
    // customerKey should be a secure random UUID, not user email or auto-increment ID
    // Store in localStorage for consistency across sessions
    const storageKey = 'toss_customer_key';
    let customerKey = localStorage.getItem(storageKey);

    if (!customerKey) {
      customerKey = uuidv4();
      localStorage.setItem(storageKey, customerKey);
    }

    return customerKey;
  }, []);

  const handleBillingAuth = async () => {
    if (!sdkLoaded || !window.TossPayments) {
      setError('결제 모듈이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (!session?.user) {
      setError('로그인이 필요합니다.');
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

      const customerKey = getCustomerKey();
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

  // Test mode handler for TOSS_TEST_MODE=true
  const handleTestModeBilling = async () => {
    if (!session?.user) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const customerKey = getCustomerKey();
      const baseUrl = window.location.origin;

      // In test mode, simulate success redirect with mock authKey
      const mockAuthKey = `test_auth_${Date.now()}`;
      const successUrl = `${baseUrl}/billing/success?authKey=${mockAuthKey}&customerKey=${customerKey}&plan=${plan}&billingCycle=${billingCycle}&amount=${amount}`;

      // Redirect to success page
      window.location.href = successUrl;
    } catch (err) {
      console.error('Test mode billing error:', err);
      setError('테스트 결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    // Check if in test mode
    const isTestMode = process.env.NEXT_PUBLIC_TOSS_TEST_MODE === 'true';

    if (isTestMode) {
      handleTestModeBilling();
    } else {
      handleBillingAuth();
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading || (!sdkLoaded && process.env.NEXT_PUBLIC_TOSS_TEST_MODE !== 'true')}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
          isLoading || (!sdkLoaded && process.env.NEXT_PUBLIC_TOSS_TEST_MODE !== 'true')
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
        ) : !sdkLoaded && process.env.NEXT_PUBLIC_TOSS_TEST_MODE !== 'true' ? (
          '결제 모듈 로딩 중...'
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
