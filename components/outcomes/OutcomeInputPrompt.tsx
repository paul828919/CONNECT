'use client';

import { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface OutcomeInputPromptProps {
  matchId: string;
  programId: string;
  organizationId: string;
  programTitle: string;
}

type OutcomeStatus = 'PLANNING' | 'SUBMITTED' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN';

// ============================================================================
// Component
// ============================================================================

/**
 * Outcome Input Prompt
 *
 * Displayed on expired/past-deadline matches to encourage users to report
 * their application outcomes. This data feeds back into the personalization
 * engine for better future recommendations.
 */
export function OutcomeInputPrompt({
  matchId,
  programId,
  organizationId,
  programTitle,
}: OutcomeInputPromptProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<OutcomeStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!selectedStatus) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          organizationId,
          programId,
          status: selectedStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit outcome');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit outcome');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedStatus, matchId, organizationId, programId]);

  if (submitted) {
    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800">결과가 기록되었습니다</p>
            <p className="text-xs text-green-600">
              다음 매칭 정확도 향상에 반영됩니다. 감사합니다!
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-lg">📝</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">지원 결과를 알려주세요</p>
              <p className="text-xs text-amber-600">
                결과 입력 시 다음 매칭 정확도가 향상됩니다
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="px-3 py-1.5 text-sm font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 border border-amber-300 transition-colors"
          >
            결과 입력
          </button>
        </div>
      </div>
    );
  }

  const statusOptions: { value: OutcomeStatus; label: string; icon: string }[] = [
    { value: 'SUBMITTED', label: '지원 완료', icon: '📤' },
    { value: 'SELECTED', label: '선정', icon: '🎉' },
    { value: 'REJECTED', label: '탈락', icon: '😔' },
    { value: 'WITHDRAWN', label: '철회', icon: '↩️' },
    { value: 'PLANNING', label: '지원 예정', icon: '📋' },
  ];

  return (
    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600 text-lg">📝</span>
        <p className="text-sm font-semibold text-amber-800">
          이 과제에 지원하셨나요?
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedStatus(option.value)}
            className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium transition-colors ${
              selectedStatus === option.value
                ? 'bg-amber-200 border-amber-400 text-amber-900'
                : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <span className="text-lg mb-1">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!selectedStatus || isSubmitting}
          className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '저장 중...' : '결과 저장'}
        </button>
        <button
          onClick={() => setIsExpanded(false)}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
