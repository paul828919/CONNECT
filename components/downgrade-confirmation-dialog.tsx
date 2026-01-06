'use client';

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

interface DowngradeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  targetPlan: string;
  expiresAt: Date;
  onConfirm: () => void;
  loading?: boolean;
}

export function DowngradeConfirmationDialog({
  open,
  onOpenChange,
  currentPlan,
  targetPlan,
  expiresAt,
  onConfirm,
  loading = false,
}: DowngradeConfirmationDialogProps) {
  const formattedDate = format(expiresAt, 'yyyy년 M월 d일', { locale: ko });
  const isDowngradeToFree = targetPlan === 'FREE' || targetPlan === 'Free';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>플랜 다운그레이드</DialogTitle>
          <DialogDescription>
            {currentPlan} 플랜에서 {targetPlan} 플랜으로 변경하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">현재 플랜</span>
              <span className="font-medium text-blue-600">{currentPlan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">변경 플랜</span>
              <span className="font-medium text-gray-900">{targetPlan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">적용일</span>
              <span className="font-medium">{formattedDate}</span>
            </div>
          </div>

          <div className="border-l-4 border-amber-500 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-800">
              다운그레이드 안내
            </p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>
                  <strong>{formattedDate}</strong>까지 현재 {currentPlan} 플랜의 모든 기능을 이용하실 수 있습니다.
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">✓</span>
                <span>
                  다음 결제일부터 {isDowngradeToFree ? '자동 과금이 중지됩니다.' : `${targetPlan} 플랜 요금이 청구됩니다.`}
                </span>
              </li>
              {isDowngradeToFree && (
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">!</span>
                  <span>
                    만료 후 무제한 매칭, AI 분석 등 유료 기능을 사용할 수 없습니다.
                  </span>
                </li>
              )}
              {!isDowngradeToFree && (
                <li className="flex items-start">
                  <span className="text-amber-600 mr-2">!</span>
                  <span>
                    만료 후 팀 멤버, 무제한 협업 제안 등 Team 전용 기능을 사용할 수 없습니다.
                  </span>
                </li>
              )}
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-xs text-gray-500">
              다운그레이드를 취소하려면 적용일 전에 다시 현재 플랜으로 업그레이드하세요.
            </p>
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
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : '다운그레이드 확인'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
