'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/lib/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { TossBillingWidget } from '@/components/toss-billing-widget';

interface Subscription {
  id: string;
  plan: 'FREE' | 'PRO' | 'TEAM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  status: string;
  amount: number;
  nextBillingDate: string | null;
}

// Plan prices
const PLAN_PRICES = {
  PRO: { MONTHLY: 49000, ANNUAL: 490000 },
  TEAM: { MONTHLY: 99000, ANNUAL: 990000 },
};

export default function BillingUpdatePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/me');
      if (res.ok) {
        const data = await res.json();
        if (data.subscription) {
          setSubscription(data.subscription);
        }
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchSubscription();
    }
  }, [session, fetchSubscription]);

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/dashboard/billing/update');
    }
  }, [sessionStatus, router]);

  if (sessionStatus === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 max-w-2xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription || subscription.plan === 'FREE') {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>결제 수단 변경</CardTitle>
              <CardDescription>
                활성화된 유료 구독이 없습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                결제 수단을 등록하려면 먼저 유료 플랜을 구독해주세요.
              </p>
              <Link
                href="/pricing"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                요금제 보기
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // TypeScript knows plan is 'PRO' | 'TEAM' here (after early return for FREE)
  const amount = PLAN_PRICES[subscription.plan][subscription.billingCycle];

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/subscription"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            구독 관리로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold">결제 수단 변경</h1>
          <p className="text-gray-600 mt-1">
            새 카드를 등록하면 기존 카드가 교체됩니다.
          </p>
        </div>

        {/* Warning for PAST_DUE status */}
        {subscription.status === 'PAST_DUE' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-600 flex-shrink-0"
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
              <div>
                <h3 className="font-semibold text-red-900">
                  결제 실패로 구독이 일시 중단되었습니다
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  새 결제 수단을 등록하시면 즉시 결제가 재시도됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current subscription info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">현재 구독 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">플랜</p>
                <p className="font-medium">{subscription.plan}</p>
              </div>
              <div>
                <p className="text-gray-500">결제 주기</p>
                <p className="font-medium">
                  {subscription.billingCycle === 'MONTHLY' ? '월간' : '연간'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">금액</p>
                <p className="font-medium">
                  ₩{amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">다음 결제일</p>
                <p className="font-medium">
                  {subscription.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString(
                        'ko-KR'
                      )
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New card registration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">새 카드 등록</CardTitle>
            <CardDescription>
              토스페이먼츠를 통해 안전하게 카드 정보가 암호화됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TossBillingWidget - plan is guaranteed to be PRO or TEAM here */}
            <TossBillingWidget
              plan={subscription.plan}
              billingCycle={subscription.billingCycle}
              amount={amount}
              onError={(error) => {
                toast({
                  title: '카드 등록 실패',
                  description:
                    error.message || '카드 등록 중 오류가 발생했습니다.',
                  variant: 'destructive',
                });
              }}
            />

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-900 mb-2">
                카드 변경 시 유의사항
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  새 카드 등록 시 기존 카드 정보는 자동으로 삭제됩니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  결제 실패 상태인 경우, 새 카드로 즉시 결제가 시도됩니다.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  카드 정보는 토스페이먼츠에서 안전하게 관리됩니다.
                </li>
              </ul>
            </div>

            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/subscription')}
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help section */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            결제 관련 문의:{' '}
            <a
              href="mailto:support@connectplt.kr"
              className="text-blue-600 hover:underline"
            >
              support@connectplt.kr
            </a>
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
