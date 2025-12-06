'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CheckoutConfirmationDialog } from '@/components/checkout-confirmation-dialog';
import PublicHeader from '@/components/layout/PublicHeader';

type BillingCycle = 'monthly' | 'yearly';
type Plan = 'FREE' | 'PRO' | 'TEAM';
type SubscriptionPlan = Plan;

interface PendingCheckout {
  plan: Plan;
  planName: string;
  amount: number;
}

export default function PricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loading, setLoading] = useState<Plan | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const fetchCurrentSubscription = useCallback(async () => {
    if (!session?.user) return;

    setLoadingSubscription(true);
    try {
      const res = await fetch('/api/subscriptions/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.subscription?.plan || 'FREE');
      } else {
        setCurrentPlan('FREE');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setCurrentPlan('FREE');
    } finally {
      setLoadingSubscription(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      fetchCurrentSubscription();
    } else if (status === 'unauthenticated') {
      setCurrentPlan(null);
    }
  }, [status, session, fetchCurrentSubscription]);

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
    if (!session?.user) {
      router.push('/auth/signin?callbackUrl=/pricing');
      return;
    }

    if (isCurrentPlan(plan)) return;
    if (plan === 'FREE') return;

    setPendingCheckout({ plan, planName, amount });
    setShowConfirmDialog(true);
  };

  const proceedToCheckout = async () => {
    if (!pendingCheckout) return;

    try {
      setLoading(pendingCheckout.plan);
      setShowConfirmDialog(false);

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: pendingCheckout.plan,
          billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '결제 처리 중 오류가 발생했습니다.');
        return;
      }

      // Redirect to checkout URL (test or production)
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert('결제 URL을 받지 못했습니다.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
      setPendingCheckout(null);
    }
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
        '3회 매칭 / 월',
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
        monthly: 49000,
        yearly: 490000,
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
        monthly: 99000,
        yearly: 990000,
      },
      features: [
        'Pro 플랜의 모든 기능',
        '최대 5명 팀 멤버',
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
        button: 'bg-gray-100 text-gray-400 cursor-not-allowed',
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

          {/* Billing Cycle Toggle */}
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
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-sm text-gray-500">
                      월 ₩{formatPrice(Math.floor(price / 12))} 상당
                    </p>
                  )}
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
                  disabled={isCurrent || (plan.key === 'FREE' && !session?.user) || isLoading}
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
                  <td className="py-4 px-6 text-center text-gray-600">3 / 월</td>
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
                  <td className="py-4 px-6 text-center text-gray-600">최대 5명</td>
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
    </div>
  );
}
