'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/hooks/use-toast';

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: string;
    planType: 'PRO' | 'TEAM';
    billingCycle: 'MONTHLY' | 'ANNUAL';
    amount: number; // in KRW (won)
    startDate: Date;
  };
}

export function RefundRequestModal({ isOpen, onClose, subscription }: RefundRequestModalProps) {
  const [reasonCategory, setReasonCategory] = useState<string>('');
  const [reasonText, setReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reasonCategory) {
      toast({
        title: '환불 사유를 선택해주세요',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/refund-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          reasonCategory,
          reasonText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '환불 요청이 접수되었습니다',
          description: `예상 환불 금액: ₩${data.refundRequest.estimatedAmount.toLocaleString()} (최종 금액은 담당자 검토 후 확정됩니다)`,
        });
        onClose();
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        toast({
          title: '환불 요청 실패',
          description: data.error || '환불 요청 중 오류가 발생했습니다. 다시 시도해주세요.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '네트워크 오류',
        description: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>환불 요청</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              환불 사유 선택 <span className="text-red-500">*</span>
            </label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger>
                <SelectValue placeholder="사유를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHANGE_OF_MIND">단순 변심</SelectItem>
                <SelectItem value="SERVICE_ISSUE">서비스 장애/오류</SelectItem>
                <SelectItem value="BILLING_ERROR">빌링 오류</SelectItem>
                <SelectItem value="DUPLICATE_PAYMENT">중복 결제</SelectItem>
                <SelectItem value="CONTRACT_MISMATCH">설명과 다른 서비스</SelectItem>
                <SelectItem value="OTHER">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              상세 사유 (선택사항)
            </label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="환불을 요청하는 구체적인 사유를 입력해주세요"
              rows={4}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
            <p className="font-medium mb-1">환불 처리 절차:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>접수 확인: 영업일 기준 1일 이내</li>
              <li>검토 및 승인</li>
              <li>환불 처리: 영업일 기준 3일 이내 (전자상거래법 제18조)</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reasonCategory || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? '처리 중...' : '환불 요청하기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
