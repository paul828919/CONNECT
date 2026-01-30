'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BulkDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  totalMatchCount?: number;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  count,
  totalMatchCount,
  isDeleting,
  onConfirm,
}: BulkDeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>일괄 삭제 확인</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              {count}개의 항목을 삭제(보관)하시겠습니까?
            </span>
            {totalMatchCount != null && totalMatchCount > 0 && (
              <span className="block mt-2 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-yellow-800 text-sm">
                ⚠️ 선택된 프로그램들에 총 {totalMatchCount.toLocaleString()}개의 활성 매칭이 있습니다.
                프로그램만 보관 처리되며, 매칭은 유지됩니다.
              </span>
            )}
            <span className="block text-xs text-muted-foreground mt-2">
              삭제 후 5분 이내에 전체 실행 취소가 가능합니다.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? '처리 중...' : `${count}개 삭제`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
