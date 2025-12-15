'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/lib/hooks/use-toast';
import { RefundRequestModal } from '@/components/refund-request-modal';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { calculateRefund } from '@/lib/refund-calculator';
import { BillingStatusBanner, PaymentMethodUpdateLink } from '@/components/billing-status-banner';

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refundAmount, setRefundAmount] = useState(0);

  // Feature flag check
  const isRefundUIEnabled = process.env.NEXT_PUBLIC_ENABLE_SELF_SERVICE_REFUND_UI === 'true';

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/me');
      if (res.ok) {
        const data = await res.json();
        if (data.subscription) {
          setSubscription(data.subscription);

          // Calculate refund estimate (client-side preview)
          const calculation = calculateRefund({
            totalPaid: data.subscription.amount,
            startDate: new Date(data.subscription.startedAt),
            requestDate: new Date(),
            contractEndDate: new Date(data.subscription.expiresAt),
            isAnnualPlan: data.subscription.billingCycle === 'ANNUAL',
            mode: 'contractual', // Client-side estimate uses contractual mode
          });

          setRefundAmount(calculation.refundAmount);
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

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    try {
      const res = await fetch(`/api/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
      });

      if (res.ok) {
        toast({
          title: '구독이 해지되었습니다',
          description: `다음 결제일(${new Date(subscription.nextBillingDate).toLocaleDateString('ko-KR')})부터 자동 과금이 중지됩니다.`,
        });
        fetchSubscription(); // Refresh subscription data
      } else {
        const data = await res.json();
        toast({
          title: '구독 해지 실패',
          description: data.error || '구독 해지 중 오류가 발생했습니다.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: '네트워크 오류',
        description: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>구독 관리</CardTitle>
              <CardDescription>현재 활성화된 구독이 없습니다</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                프리미엄 기능을 사용하려면 구독을 시작하세요.
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

  // Determine billing status for banner
  const getBillingStatus = () => {
    if (subscription?.status === 'PAST_DUE') return 'past_due' as const;
    // Note: Card expiry check would require card info from Toss (not currently stored)
    // For now, we only show past_due status
    return 'active' as const;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">구독 관리</h1>

        {/* Billing Status Banner - shows warnings for payment issues */}
        <BillingStatusBanner status={getBillingStatus()} />

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>현재 플랜</CardTitle>
            <CardDescription>
              {subscription.plan} 플랜 (₩{subscription.amount.toLocaleString()}/
              {subscription.billingCycle === 'MONTHLY' ? '월' : '년'})
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">상태</p>
                <p className="font-medium">
                  {subscription.status === 'ACTIVE' ? '활성' :
                   subscription.status === 'CANCELED' ? '해지됨' :
                   subscription.status === 'EXPIRED' ? '만료됨' : subscription.status}
                </p>
              </div>
              <div>
                <p className="text-gray-500">다음 결제일</p>
                <p className="font-medium">
                  {subscription.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('ko-KR')
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">시작일</p>
                <p className="font-medium">
                  {new Date(subscription.startedAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">만료일</p>
                <p className="font-medium">
                  {new Date(subscription.expiresAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>

            {/* ========== Cancellation Section - Always Available ========== */}
            <div className="space-y-4 border-t pt-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">구독 해지</h3>
                <p className="text-sm text-gray-600 mb-4">
                  다음 결제일부터 자동 과금이 중지됩니다.<br />
                  현재 이용 기간(만료일까지)은 계속 사용 가능합니다.
                </p>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={subscription.status !== 'ACTIVE'}
                    className="w-full sm:w-auto"
                  >
                    구독 해지하기
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>구독을 해지하시겠습니까?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm">
                        <div>• 다음 결제일(<strong>{new Date(subscription.nextBillingDate).toLocaleDateString('ko-KR')}</strong>)부터 자동 과금이 중지됩니다.</div>
                        <div>• 현재 기간(<strong>{new Date(subscription.expiresAt).toLocaleDateString('ko-KR')}까지</strong>)은 계속 이용 가능합니다.</div>
                        <div className="text-amber-600">• 환불을 원하시는 경우 별도로 &quot;환불 신청&quot;을 해주세요.</div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription}>
                      해지하기
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {subscription.status === 'CANCELED' && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  ✓ 구독이 해지되었습니다. {new Date(subscription.expiresAt).toLocaleDateString('ko-KR')}까지 이용 가능합니다.
                </p>
              )}
            </div>

            {/* ========== Refund Section - Feature Flagged ========== */}
            {isRefundUIEnabled ? (
              <div className="space-y-4 border-t pt-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">환불 신청</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    • 결제일로부터 <strong>7일 이내</strong>: 전액 환불 (전자상거래법 제17조)<br />
                    • <strong>7일 경과 후</strong>: 약관에 따른 일할 계산 환불 (위약금 차감)
                  </p>
                </div>

                {/* Refund estimate card */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 mb-1">예상 환불 금액</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ₩{refundAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    * 최종 금액은 담당자 검토 후 확정됩니다
                  </p>
                </div>

                <Button
                  variant="outline"
                  disabled={refundAmount === 0 || subscription.status !== 'ACTIVE'}
                  onClick={() => setRefundModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  환불 신청하기
                </Button>

                {refundAmount === 0 && subscription.status === 'ACTIVE' && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                    현재 요금제/사용기간 기준으로 환불 가능 금액이 0원입니다.{' '}
                    <Link href="/refund-policy" className="text-blue-600 underline hover:text-blue-700">
                      환불 정책
                    </Link>
                    을 참고해 주세요.
                  </p>
                )}
              </div>
            ) : (
              /* ========== FLAG OFF: Email Fallback for Refund Only ========== */
              <div className="space-y-4 border-t pt-6 mt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">환불 신청</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    환불을 원하시는 경우 아래 이메일로 문의해 주세요.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">고객센터 이메일</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-300 flex-1">
                        support@connectplt.kr
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText('support@connectplt.kr');
                          toast({
                            title: '복사 완료',
                            description: '이메일 주소가 클립보드에 복사되었습니다.',
                          });
                        }}
                      >
                        복사
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-blue-200 pt-3">
                    <p className="text-xs text-gray-600 mb-2">아래 내용을 포함하여 이메일을 보내주세요:</p>
                    <div className="bg-white rounded border border-gray-300 p-3 text-xs text-gray-700 font-mono whitespace-pre-wrap">
{`제목: [Connect] 환불 요청

안녕하세요,

다음 정보로 환불을 요청합니다:

- 사용자 이메일: ${session?.user?.email || '[귀하의 이메일]'}
- 구독 플랜: ${subscription.plan}
- 환불 사유: [여기에 입력해주세요]

감사합니다.`}
                    </div>
                  </div>

                  <div className="border-t border-blue-200 pt-3">
                    <p className="text-xs text-gray-600">
                      📧 접수 안내: 영업일 기준 1일 이내<br />
                      ⏱️ 처리 완료: 영업일 기준 3일 이내 (전자상거래법 제18조)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              {subscription.paymentMethod || '등록된 결제 수단이 없습니다'}
            </p>
            <div className="pt-2">
              <PaymentMethodUpdateLink />
            </div>
          </CardContent>
        </Card>

        <RefundRequestModal
          isOpen={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          subscription={{
            id: subscription.id,
            planType: subscription.plan,
            billingCycle: subscription.billingCycle,
            amount: subscription.amount,
            startDate: new Date(subscription.startedAt),
          }}
        />
      </div>
    </DashboardLayout>
  );
}
