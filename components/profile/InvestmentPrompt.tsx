'use client';

/**
 * Investment Verification Prompt Component (Phase 4)
 *
 * Conditionally displayed when:
 * 1. User has CONDITIONALLY_ELIGIBLE matches that require investment verification
 * 2. User has not yet provided investment history
 *
 * Progressive profiling pattern: Only ask for data when it's needed for matching.
 *
 * Triggers:
 * - Match fails "투자 유치 실적 미확인" requirement
 * - Organization.investmentHistory is NULL or empty
 */

import { useState, useEffect } from 'react';
import { InvestmentHistoryForm } from '@/components/forms/InvestmentHistoryForm';

interface InvestmentPromptProps {
  organizationId: string;
  hasInvestmentHistory: boolean;
  needsInvestmentVerification: boolean;
  requiredInvestmentAmount?: number; // Minimum amount required by program
}

export function InvestmentPrompt({
  organizationId,
  hasInvestmentHistory,
  needsInvestmentVerification,
  requiredInvestmentAmount,
}: InvestmentPromptProps) {
  const [showForm, setShowForm] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if user already dismissed this prompt in current session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('investmentPromptDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Don't show if:
  // - Already has investment history
  // - Doesn't need investment verification
  // - User dismissed the prompt
  if (hasInvestmentHistory || !needsInvestmentVerification || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('investmentPromptDismissed', 'true');
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억원`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  if (showForm) {
    return (
      <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-6 mb-6">
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                💰 투자 유치 실적 입력
              </h3>
              <p className="text-sm text-gray-700">
                아래 매칭 결과에서 투자 요건을 충족하면 더 많은 프로그램을 추천받을 수 있습니다
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="닫기"
            >
              <svg
                className="w-5 h-5"
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
            </button>
          </div>
        </div>

        <InvestmentHistoryForm
          organizationId={organizationId}
          onSuccess={() => {
            // Reload page to refresh matches
            window.location.reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl">💰</div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            추가 매칭 기회: 투자 유치 실적을 입력하세요
          </h3>
          <div className="text-sm text-gray-700 space-y-2 mb-4">
            <p>
              현재 매칭된 프로그램 중 일부는{' '}
              <strong className="text-blue-700">
                {requiredInvestmentAmount
                  ? `${formatCurrency(requiredInvestmentAmount)} 이상의 투자 유치 실적`
                  : '투자 유치 실적'}
              </strong>
              을 요구합니다.
            </p>
            <p>
              • <strong>투자 이력을 입력하면</strong> CONDITIONALLY_ELIGIBLE → FULLY_ELIGIBLE로
              승격
            </p>
            <p>
              • <strong>선정 확률이 높아지며</strong> 더 많은 프로그램 추천 가능
            </p>
            <p>
              • <strong>3-5 영업일 내 Connect 팀 검증</strong> 후 매칭에 반영
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              투자 이력 입력하기
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              나중에 입력
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 rounded-lg bg-white border border-blue-200 p-3">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 text-sm">ℹ️</div>
          <div className="text-xs text-gray-600">
            <strong>Progressive Profiling:</strong> Connect는 필요할 때만 추가 정보를
            요청합니다. 투자 이력이 필요 없는 프로그램도 많으므로, 지금 입력하지 않아도
            현재 매칭 결과에는 영향이 없습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
