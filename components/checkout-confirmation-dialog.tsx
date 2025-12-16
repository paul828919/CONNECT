'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { calculateNextBillingDate, formatBillingCycle, getDateLabel } from '@/lib/billing-date-calculator';

interface CheckoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planType: 'MONTHLY' | 'ANNUAL';
  amount: number;
  onConfirm: () => void;
  loading?: boolean;
}

export function CheckoutConfirmationDialog({
  open,
  onOpenChange,
  planName,
  planType,
  amount,
  onConfirm,
  loading = false,
}: CheckoutConfirmationDialogProps) {
  const [consented, setConsented] = useState(false);

  const { nextBillingDate, isEstimated } = calculateNextBillingDate({
    planType,
  });

  const billingCycle = formatBillingCycle(planType);
  const dateLabel = getDateLabel(isEstimated);

  const handleConfirm = () => {
    if (!consented) {
      alert('자동 갱신 조건을 확인하고 동의해주세요.');
      return;
    }
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>구독 확인</DialogTitle>
          <DialogDescription>
            {planName} 플랜을 구독하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">플랜</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">결제 주기</span>
              <span className="font-medium">{billingCycle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">결제 금액</span>
              <span className="font-medium">₩{amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
            <p className="text-sm font-medium text-gray-800">
              ⚠️ 이 플랜은 {billingCycle} 자동 갱신됩니다
            </p>
            <p className="text-sm text-gray-700 mt-2">
              {dateLabel}:{' '}
              <span className="font-semibold">
                {format(nextBillingDate, 'yyyy년 M월 d일', { locale: ko })}
              </span>
            </p>
            <p className="text-sm text-gray-700 mt-2">
              언제든지 구독 플랜을 해지·환불할 수 있으며, 자세한 내용은{' '}
              <Link
                href="/dashboard/subscription"
                className="text-blue-600 underline hover:text-blue-800"
              >
                구독관리
              </Link>
              와{' '}
              <Link
                href="/refund-policy"
                className="text-blue-600 underline hover:text-blue-800"
                target="_blank"
              >
                환불정책
              </Link>
              을 참고해 주세요.
            </p>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="auto-renewal-consent"
              checked={consented}
              onChange={(e) => setConsented(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="auto-renewal-consent" className="text-sm text-gray-700">
              이 플랜이 {billingCycle} 자동 갱신되며, 다음 결제일과 해지·환불 내용을 확인했습니다.
            </label>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!consented || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '결제 진행'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
