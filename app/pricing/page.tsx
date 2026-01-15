'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckoutConfirmationDialog } from '@/components/checkout-confirmation-dialog';
import { DowngradeConfirmationDialog } from '@/components/downgrade-confirmation-dialog';
import PublicHeader from '@/components/layout/PublicHeader';
import { TossBillingWidget } from '@/components/toss-billing-widget';

type BillingCycle = 'monthly' | 'yearly';
type Plan = 'FREE' | 'PRO' | 'TEAM';
type SubscriptionPlan = Plan;

interface PendingCheckout {
  plan: Plan;
  planName: string;
  amount: number;
}

// Flag to show billing widget after confirmation dialog
interface BillingWidgetState {
  show: boolean;
  plan: 'PRO' | 'TEAM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amount: number;
}

interface PendingDowngrade {
  targetPlan: Plan;
  targetPlanName: string;
  currentPlanName: string;
  expiresAt: Date;
  existingDowngradePlan: string | null;
}

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState<Plan | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [billingWidgetState, setBillingWidgetState] = useState<BillingWidgetState | null>(null);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [pendingDowngrade, setPendingDowngrade] = useState<PendingDowngrade | null>(null);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [existingDowngradePlan, setExistingDowngradePlan] = useState<string | null>(null);

  const fetchCurrentSubscription = useCallback(async () => {
    if (!session?.user) return;

    setLoadingSubscription(true);
    try {
      const res = await fetch('/api/subscriptions/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.subscription?.plan || 'FREE');
        if (data.subscription?.expiresAt) {
          setSubscriptionExpiresAt(new Date(data.subscription.expiresAt));
        }
        // Extract existing downgrade plan from cancellationReason
        const cancellationReason = data.subscription?.cancellationReason;
        if (cancellationReason?.startsWith('DOWNGRADE:')) {
          setExistingDowngradePlan(cancellationReason.replace('DOWNGRADE:', ''));
        } else {
          setExistingDowngradePlan(null);
        }
      } else {
        setCurrentPlan('FREE');
        setSubscriptionExpiresAt(null);
        setExistingDowngradePlan(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setCurrentPlan('FREE');
      setSubscriptionExpiresAt(null);
      setExistingDowngradePlan(null);
    } finally {
      setLoadingSubscription(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchCurrentSubscription();
      // Log funnel event: UPGRADE_VIEWED (only for FREE users viewing pricing)
      // We'll track this after we know their current plan
    } else if (status === 'unauthenticated') {
      setCurrentPlan(null);
    }
  }, [status, session, fetchCurrentSubscription]);

  // Track UPGRADE_VIEWED for logged-in FREE users
  useEffect(() => {
    if (session?.user && currentPlan === 'FREE') {
      fetch('/api/funnel/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'UPGRADE_VIEWED' }),
      }).catch((err) => console.error('Failed to track upgrade_viewed:', err));
    }
  }, [session, currentPlan]);

  const isCurrentPlan = (planKey: Plan): boolean => {
    return currentPlan === planKey;
  };

  const getCtaText = (planKey: Plan, defaultCta: string): string => {
    if (!session?.user) {
      return planKey === 'FREE' ? '무료로 시작' : defaultCta;
    }

    if (loadingSubscription) {
      return '확인 중...';
    }

    if (isCurrentPlan(planKey)) {
      return '현재 플랜';
    }

    const planOrder: Record<Plan, number> = { FREE: 0, PRO: 1, TEAM: 2 };

    if (currentPlan && planOrder[planKey] < planOrder[currentPlan]) {
      return '다운그레이드';
    }

    return defaultCta;
  };

  const handleUpgrade = (plan: Plan, planName: string, amount: number) => {
    // For unauthenticated users, redirect to signin for any plan (including Free)
    if (!session?.user) {
      router.push('/auth/signin?callbackUrl=/dashboard');
      return;
    }

    // Skip if already on this plan
    if (isCurrentPlan(plan)) return;

    // Check if this is a downgrade
    const planOrder: Record<Plan, number> = { FREE: 0, PRO: 1, TEAM: 2 };
    const isDowngrade = currentPlan && planOrder[plan] < planOrder[currentPlan];

    if (isDowngrade) {
      // Show downgrade confirmation dialog
      const currentPlanName = currentPlan === 'PRO' ? 'Pro' : currentPlan === 'TEAM' ? 'Team' : 'Free';
      setPendingDowngrade({
        targetPlan: plan,
        targetPlanName: planName,
        currentPlanName,
        expiresAt: subscriptionExpiresAt || new Date(),
        existingDowngradePlan,
      });
      setShowDowngradeDialog(true);
      return;
    }

    // Free plan for new users: redirect to dashboard
    if (plan === 'FREE') {
      router.push('/dashboard');
      return;
    }

    // Paid plans (upgrade): show checkout confirmation dialog
    setPendingCheckout({ plan, planName, amount });
    setShowConfirmDialog(true);
  };

  const handleDowngrade = async () => {
    if (!pendingDowngrade) return;

    setDowngradeLoading(true);
    try {
      const res = await fetch('/api/subscriptions/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan: pendingDowngrade.targetPlan }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowDowngradeDialog(false);
        setPendingDowngrade(null);
        // Show success message and redirect
        alert(data.message);
        router.push('/dashboard');
      } else {
        alert(data.error || '다운그레이드 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Downgrade error:', error);
      alert('다운그레이드 처리 중 오류가 발생했습니다.');
    } finally {
      setDowngradeLoading(false);
    }
  };

  const proceedToCheckout = async () => {
    if (!pendingCheckout) return;

    // Frontend validation for billing cycle
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      alert('유효하지 않은 결제 주기입니다. 페이지를 새로고침 후 다시 시도해주세요.');
      return;
    }

    // Only PRO and TEAM plans go through billing
    if (pendingCheckout.plan !== 'PRO' && pendingCheckout.plan !== 'TEAM') {
      alert('유효하지 않은 플랜입니다.');
      return;
    }

    // Close confirmation dialog and show billing widget
    setShowConfirmDialog(false);
    setBillingWidgetState({
      show: true,
      plan: pendingCheckout.plan as 'PRO' | 'TEAM',
      billingCycle: billingCycle === 'yearly' ? 'ANNUAL' : 'MONTHLY',
      amount: pendingCheckout.amount,
    });
    setPendingCheckout(null);
  };

  const handleBillingError = (error: Error) => {
    console.error('Billing error:', error);
    setBillingWidgetState(null);
    alert(error.message || '결제 처리 중 오류가 발생했습니다.');
  };

  const closeBillingWidget = () => {
    setBillingWidgetState(null);
  };

  const plans = [
    {
      name: 'Free',
      key: 'FREE' as Plan,
      description: 'Connect를 처음 경험하는 연구자',
      secondaryDescription: '플랫폼 탐색 및 매칭 품질 검증',
      pricing: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        '2회 매칭 / 월',
        '기본 프로필 관리',
        '실시간 과제 공고 매칭',
        '매칭 스코어 확인',
        '이메일 지원 (48시간 이내)',
      ],
      limitations: [],
      defaultCta: '무료로 시작',
      highlighted: false,
      color: 'gray',
    },
    {
      name: 'Pro',
      key: 'PRO' as Plan,
      description: '과제 수주를 본격 추진하는 연구팀',
      secondaryDescription: '단일 부서/연구실의 실무 활용',
      pricing: {
        monthly: 20900,  // VAT-inclusive (₩19,000 + ₩1,900 VAT)
        yearly: 490000,  // Keep for future use
      },
      features: [
        '무제한 매칭 생성',
        'AI 기반 상세 매칭 분석',
        '실시간 매칭',
        '협업 제안 월 10회',
        '우선 이메일 지원 (24시간 내)',
      ],
      limitations: [],
      defaultCta: 'Pro 시작하기',
      highlighted: true,
      color: 'blue',
    },
    {
      name: 'Team',
      key: 'TEAM' as Plan,
      description: '조직 전체의 R&D 경쟁력을 관리하는 기관',
      secondaryDescription: '다수 부서의 통합 관리',
      pricing: {
        monthly: 62700,  // VAT-inclusive (₩57,000 + ₩5,700 VAT)
        yearly: 990000,  // Keep for future use
      },
      features: [
        'Pro 플랜의 모든 기능',
        '최대 3명 팀 멤버',
        '무제한 협업 제안',
        '셀프서비스 온보딩 가이드',
        '프리미엄 이메일 지원 (12시간 내)',
      ],
      limitations: [],
      defaultCta: 'Team 시작하기',
      highlighted: false,
      color: 'purple',
    },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const getColorClasses = (color: string, highlighted: boolean) => {
    const colors: Record<string, any> = {
      gray: {
        border: 'border-gray-200',
        bg: 'bg-white',
        text: 'text-gray-900',
        button: 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg',
        badge: 'bg-gray-100 text-gray-600',
      },
      blue: {
        border: highlighted ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200',
        bg: 'bg-white',
        text: 'text-blue-900',
        button: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105',
        badge: 'bg-blue-500 text-white',
      },
      purple: {
        border: 'border-purple-200',
        bg: 'bg-white',
        text: 'text-purple-900',
        button: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105',
        badge: 'bg-purple-100 text-purple-600',
      },
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <PublicHeader />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            프로젝트에 맞는 플랜을 선택하세요
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            연구 단계와 팀 규모에 맞는 최적의 플랜으로 시작하세요
          </p>

          {/* Billing Cycle Toggle - Commented out for monthly-only display
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-md">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              월간 결제
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              연간 결제
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                ~17% 할인
              </span>
            </button>
          </div>
          */}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => {
            const colors = getColorClasses(plan.color, plan.highlighted);
            const price = plan.pricing[billingCycle];
            const isLoading = loading === plan.key;
            const isCurrent = isCurrentPlan(plan.key);
            const ctaText = getCtaText(plan.key, plan.defaultCta);

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 ${colors.border} ${colors.bg} p-8 shadow-xl transition-all hover:shadow-2xl ${
                  plan.highlighted ? 'transform scale-105' : ''
                } ${isCurrent ? 'ring-2 ring-green-400' : ''}`}
              >
                {/* Most Popular Badge - Always shown for Pro plan */}
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className={`${colors.badge} px-4 py-1 rounded-full text-sm font-semibold shadow-md`}>
                      가장 인기
                    </span>
                  </div>
                )}
                {/* Current Plan Badge */}
                {isCurrent && session?.user && (
                  <div className={`absolute -top-4 ${plan.highlighted ? 'right-4' : 'left-1/2 transform -translate-x-1/2'}`}>
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                      현재 구독 중
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold ${colors.text} mb-2`}>
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">{plan.description}</p>
                  <p className="text-xs text-gray-400 mb-4">{plan.secondaryDescription}</p>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ₩{formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-600 ml-2">
                        / {billingCycle === 'monthly' ? '월' : '년'}
                      </span>
                    )}
                  </div>
                  {price > 0 && (
                    <p className="text-xs text-gray-500">(VAT 포함)</p>
                  )}
                  {/* Commented out - yearly only display
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-sm text-gray-500">
                      월 ₩{formatPrice(Math.floor(price / 12))} 상당
                    </p>
                  )}
                  */}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, idx) => (
                    <li key={`limit-${idx}`} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="text-sm text-gray-500">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.key, plan.name, price)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    isCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : colors.button
                  } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      처리 중...
                    </span>
                  ) : (
                    ctaText
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Social Proof Section */}
        <div className="my-12 text-center">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gray-300" />
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">
                1,600+ 국가 R&D 사업 공고 실시간 모니터링 중
              </span>
            </div>
            <div className="h-px w-16 bg-gray-300" />
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            플랜 비교
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-6 font-semibold text-gray-900">
                    기능
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-gray-600">
                    Free
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-blue-600">
                    Pro
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-purple-600">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-4 px-6 text-gray-700">매칭 생성 횟수</td>
                  <td className="py-4 px-6 text-center text-gray-600">2 / 월</td>
                  <td className="py-4 px-6 text-center text-green-600 font-semibold">
                    무제한
                  </td>
                  <td className="py-4 px-6 text-center text-green-600 font-semibold">
                    무제한
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 text-gray-700">상세 매칭 설명</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-gray-400">—</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <svg className="h-5 w-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <svg className="h-5 w-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-gray-700">실시간 매칭</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-gray-400">—</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <svg className="h-5 w-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <svg className="h-5 w-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 text-gray-700">협업 제안</td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-gray-400">—</span>
                  </td>
                  <td className="py-4 px-6 text-center text-gray-600">10회 / 월</td>
                  <td className="py-4 px-6 text-center text-green-600 font-semibold">
                    무제한
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 text-gray-700">팀 멤버 수</td>
                  <td className="py-4 px-6 text-center text-gray-600">1명</td>
                  <td className="py-4 px-6 text-center text-gray-600">1명</td>
                  <td className="py-4 px-6 text-center text-gray-600">최대 3명</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-4 px-6 text-gray-700">지원 응답 시간</td>
                  <td className="py-4 px-6 text-center text-gray-600">48시간</td>
                  <td className="py-4 px-6 text-center text-gray-600">24시간</td>
                  <td className="py-4 px-6 text-center text-green-600 font-semibold">
                    12시간
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Refund Policy Notice */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg p-8 border-2 border-blue-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  💯 안심하고 시작하세요 - 환불 보장
                </h3>
                <div className="space-y-2 text-gray-700 mb-4">
                  <p className="flex items-start">
                    <span className="text-green-600 mr-2 flex-shrink-0">✓</span>
                    <span><strong>월간 플랜:</strong> 7일 이내 전액 환불 (1회 한정 정책)</span>
                  </p>
                  <p className="flex items-start">
                    <span className="text-green-600 mr-2 flex-shrink-0">✓</span>
                    <span><strong>연간 플랜:</strong> 7일 이내 전액 환불 (법정 청약철회권)</span>
                  </p>
                  <p className="flex items-start">
                    <span className="text-green-600 mr-2 flex-shrink-0">✓</span>
                    <span><strong>서비스 이슈:</strong> 기간 무관 전액 환불 (장애, 빌링 오류 등)</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/refund-policy"
                    className="inline-flex items-center px-5 py-2.5 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-md"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    전체 환불 정책 보기
                  </Link>
                  <Link
                    href="/terms"
                    className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
                  >
                    이용약관 확인
                  </Link>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">
                  본 환불 정책은 전자상거래법을 준수하며, 법정 소비자 권리는 항상 보장됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-8 text-center bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            플랜 선택에 도움이 필요하신가요?
          </h3>
          <p className="text-gray-600 mb-4">
            고객 지원팀에 문의하시면 더 자세한 도움을 받으실 수 있습니다.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            고객 지원 문의하기
          </Link>
        </div>
      </div>

      {/* Checkout Confirmation Dialog */}
      {pendingCheckout && (
        <CheckoutConfirmationDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          planName={pendingCheckout.planName}
          planType={billingCycle === 'yearly' ? 'ANNUAL' : 'MONTHLY'}
          amount={pendingCheckout.amount}
          onConfirm={proceedToCheckout}
          loading={loading !== null}
        />
      )}

      {/* Toss Billing Widget Modal */}
      {billingWidgetState?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            {/* Close Button */}
            <button
              onClick={closeBillingWidget}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">결제 카드 등록</h2>
              <p className="text-gray-600">
                {billingWidgetState.plan} 플랜 ({billingWidgetState.billingCycle === 'MONTHLY' ? '월간' : '연간'})
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-2">
                ₩{new Intl.NumberFormat('ko-KR').format(billingWidgetState.amount)}
              </p>
            </div>

            {/* Toss Billing Widget */}
            <TossBillingWidget
              plan={billingWidgetState.plan}
              billingCycle={billingWidgetState.billingCycle}
              amount={billingWidgetState.amount}
              onError={handleBillingError}
            />

            {/* Security Notice */}
            <p className="text-xs text-center text-gray-500 mt-4">
              🔒 결제 정보는 토스페이먼츠를 통해 안전하게 처리됩니다
            </p>
          </div>
        </div>
      )}

      {/* Downgrade Confirmation Dialog */}
      {pendingDowngrade && (
        <DowngradeConfirmationDialog
          open={showDowngradeDialog}
          onOpenChange={setShowDowngradeDialog}
          currentPlan={pendingDowngrade.currentPlanName}
          targetPlan={pendingDowngrade.targetPlanName}
          expiresAt={pendingDowngrade.expiresAt}
          existingDowngradePlan={pendingDowngrade.existingDowngradePlan}
          onConfirm={handleDowngrade}
          loading={downgradeLoading}
        />
      )}
    </div>
  );
}
