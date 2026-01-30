'use client';

import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { useToast } from '@/lib/hooks/use-toast';

interface UseEditRowOptions {
  tableName: string;
  onSuccess: (updatedData: Record<string, any>) => void;
}

interface UseEditRowReturn {
  saveRow: (id: string, changes: Record<string, any>) => Promise<boolean>;
  isSaving: boolean;
  errors: Record<string, string>;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
}

export function useEditRow({ tableName, onSuccess }: UseEditRowOptions): UseEditRowReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const saveRow = useCallback(
    async (id: string, changes: Record<string, any>): Promise<boolean> => {
      setIsSaving(true);
      setErrors({});
      try {
        const res = await fetch(
          `/api/admin/data-quality-console/${tableName}/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(changes),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 400 && body.fieldErrors) {
            setErrors(body.fieldErrors);
            toast({
              title: '저장 실패',
              description: '입력값을 확인해 주세요.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: '저장 실패',
              description: body.error || '알 수 없는 오류가 발생했습니다.',
              variant: 'destructive',
            });
          }
          return false;
        }

        const data = await res.json();
        toast({
          title: '저장 완료',
          description: data.message || '변경사항이 저장되었습니다.',
        });
        onSuccess(data.updatedRow);
        return true;
      } catch (error) {
        console.error('Save error:', error);
        toast({
          title: '저장 실패',
          description: '네트워크 오류가 발생했습니다.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [tableName, onSuccess, toast]
  );

  return { saveRow, isSaving, errors, setErrors };
}
