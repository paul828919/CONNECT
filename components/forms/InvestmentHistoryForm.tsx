'use client';

/**
 * Investment History Form Component (Phase 4)
 *
 * Progressive profiling form for capturing investment verification data.
 *
 * Features:
 * - Date/amount/source input fields
 * - Prominent disclaimer (only real received investment)
 * - Verification status tracking
 * - Validation and formatting
 *
 * Data Structure (JSON stored in organizations.investmentHistory):
 * [
 *   {
 *     date: "2024-01-15",
 *     amount: 200000000, // KRW
 *     source: "ABC Ventures",
 *     verified: false // Admin will verify
 *   }
 * ]
 */

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Investment entry schema
const investmentEntrySchema = z.object({
  date: z.string().min(1, '투자 날짜를 선택해주세요'),
  amount: z
    .number()
    .min(1000000, '최소 100만원 이상이어야 합니다')
    .max(1000000000000, '금액이 너무 큽니다 (최대 1조원)'),
  source: z
    .string()
    .min(2, '투자자명을 입력해주세요')
    .max(100, '투자자명은 100자 이하여야 합니다'),
  verified: z.boolean().default(false), // Admin will verify later
});

// Form schema (array of investments)
const investmentHistorySchema = z.object({
  investments: z.array(investmentEntrySchema).min(1, '최소 1건의 투자 이력이 필요합니다'),
});

type InvestmentHistoryData = z.infer<typeof investmentHistorySchema>;
type InvestmentEntry = z.infer<typeof investmentEntrySchema>;

interface InvestmentHistoryFormProps {
  organizationId: string;
  initialData?: InvestmentEntry[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InvestmentHistoryForm({
  organizationId,
  initialData = [],
  onSuccess,
  onCancel,
}: InvestmentHistoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvestmentHistoryData>({
    resolver: zodResolver(investmentHistorySchema),
    defaultValues: {
      investments:
        initialData.length > 0
          ? initialData
          : [
              {
                date: '',
                amount: 0,
                source: '',
                verified: false,
              },
            ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'investments',
  });

  const onSubmit = async (data: InvestmentHistoryData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Update organization's investment history
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investmentHistory: data.investments,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '투자 이력 저장에 실패했습니다');
      }

      setSuccessMessage('투자 이력이 저장되었습니다. Connect 팀에서 검증 후 매칭에 반영됩니다.');

      // Call success callback after delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  // Calculate total investment
  const investments = watch('investments');
  const totalInvestment = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  return (
    <div className="space-y-6">
      {/* CRITICAL: Prominent Disclaimer (Phase 4 Requirement) */}
      <div className="rounded-lg border-2 border-red-500 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">⚠️</div>
          <div>
            <h3 className="text-lg font-bold text-red-900 mb-2">
              중요: 실제로 수령한 투자금만 입력하세요
            </h3>
            <div className="text-sm text-red-800 space-y-2">
              <p>
                • <strong>실제 수령한 투자금</strong>만 입력해주세요 (약속된 금액 X)
              </p>
              <p>
                • Connect 팀에서 <strong>투자 확인서/계약서를 검증</strong>합니다
              </p>
              <p>
                • 허위 정보 입력 시 <strong>매칭 자격이 영구 정지</strong>될 수 있습니다
              </p>
              <p>
                • 검증 완료까지 <strong>3-5 영업일</strong> 소요됩니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            ✅ {successMessage}
          </div>
        )}

        {/* Investment Entries */}
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="rounded-lg border border-gray-200 bg-white p-6 space-y-4"
            >
              {/* Entry Header */}
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  투자 이력 #{index + 1}
                </h4>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* Investment Date */}
              <div>
                <label
                  htmlFor={`investments.${index}.date`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  투자 수령 날짜 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id={`investments.${index}.date`}
                  {...register(`investments.${index}.date`)}
                  max={new Date().toISOString().split('T')[0]} // Cannot be future date
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.investments?.[index]?.date && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.investments[index]?.date?.message}
                  </p>
                )}
              </div>

              {/* Investment Amount */}
              <div>
                <label
                  htmlFor={`investments.${index}.amount`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  투자 금액 (원) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id={`investments.${index}.amount`}
                  {...register(`investments.${index}.amount`, {
                    valueAsNumber: true,
                  })}
                  min="1000000"
                  max="1000000000000"
                  step="1000000"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 200000000 (2억원)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 예시: 2억원 = 200,000,000원 / 5,000만원 = 50,000,000원
                </p>
                {errors.investments?.[index]?.amount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.investments[index]?.amount?.message}
                  </p>
                )}
              </div>

              {/* Investment Source */}
              <div>
                <label
                  htmlFor={`investments.${index}.source`}
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  투자자명 (VC/엔젤/정부기관) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id={`investments.${index}.source`}
                  {...register(`investments.${index}.source`)}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: ABC Ventures, 한국벤처투자, 기술보증기금"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 투자 확인서에 명시된 정확한 투자자명을 입력해주세요
                </p>
                {errors.investments?.[index]?.source && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.investments[index]?.source?.message}
                  </p>
                )}
              </div>

              {/* Verification Status (Read-only) */}
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600 font-medium text-sm">
                    🔍 검증 상태:
                  </span>
                  <span className="text-yellow-800 text-sm font-semibold">
                    미검증 (Connect 팀에서 검토 예정)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Investment Button */}
        <button
          type="button"
          onClick={() =>
            append({
              date: '',
              amount: 0,
              source: '',
              verified: false,
            })
          }
          className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-gray-700 hover:border-gray-400 hover:bg-gray-100 transition-colors"
        >
          + 투자 이력 추가
        </button>

        {/* Total Investment Summary */}
        {totalInvestment > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                총 투자 유치 금액
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalInvestment)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 검증 완료 시 해당 금액 이상의 투자 조건이 있는 프로그램 매칭에 포함됩니다
            </p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                저장 중...
              </span>
            ) : (
              '투자 이력 저장하기'
            )}
          </button>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600">ℹ️</div>
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-2">검증 프로세스 안내</p>
              <ol className="space-y-1 list-decimal list-inside">
                <li>투자 이력 제출 → Connect 팀 검토 시작</li>
                <li>
                  이메일로 투자 확인서/계약서 요청 (영업일 기준 1-2일 내)
                </li>
                <li>서류 검토 및 승인 (영업일 기준 2-3일)</li>
                <li>검증 완료 → 매칭 알고리즘 자동 적용</li>
              </ol>
              <p className="mt-2 text-xs text-gray-500">
                💡 검증 완료 시 프로필 페이지에 &quot;인증됨&quot; 배지가 표시됩니다
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
