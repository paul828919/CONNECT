'use client';

import { useState, useEffect } from 'react';

interface HistoricalMatchesPromptProps {
  organizationId: string;
  onViewHistoricalMatches: () => void;
}

/**
 * Historical Matches Prompt Component
 *
 * Displayed when user has no current matches during off-season (Oct-Dec).
 * Encourages users to view EXPIRED programs from 2025 to prepare for 2026.
 *
 * UX Strategy:
 * - Clear value proposition: "Study past programs to prepare future proposals"
 * - Opt-in design: User must explicitly click to view historical matches
 * - Educational framing: "Reference" not "Apply"
 * - OPTION B: Enhanced visual prominence (larger card, animations, hover effects)
 * - OPTION C: Count preview in button text
 */
export function HistoricalMatchesPrompt({
  organizationId,
  onViewHistoricalMatches
}: HistoricalMatchesPromptProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historicalCount, setHistoricalCount] = useState<number | null>(null);

  // OPTION C: Fetch historical match count on mount
  useEffect(() => {
    const fetchHistoricalCount = async () => {
      try {
        const res = await fetch(
          `/api/matches/historical/count?organizationId=${organizationId}`
        );
        if (res.ok) {
          const data = await res.json();
          setHistoricalCount(data.count);
        }
      } catch (err) {
        console.error('Error fetching historical count:', err);
        // Silently fail - count is optional enhancement
      }
    };

    fetchHistoricalCount();
  }, [organizationId]);

  const handleGenerateHistoricalMatches = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      // Call historical match generation API
      const res = await fetch(
        `/api/matches/historical/generate?organizationId=${organizationId}`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const errorData = await res.json();

        // Handle rate limit error (429)
        if (res.status === 429) {
          setError(errorData.message || '이번 달 무료 매칭 횟수를 모두 사용하셨습니다.');
          return;
        }

        throw new Error(errorData.message || 'Failed to generate historical matches');
      }

      const data = await res.json();

      // If successful, trigger parent callback to refresh matches
      if (data.success) {
        onViewHistoricalMatches();
      }
    } catch (err) {
      console.error('Error generating historical matches:', err);
      setError('과거 매칭 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-8 rounded-xl bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-2 border-purple-300 p-10 shadow-lg transform transition-all hover:scale-[1.02] hover:shadow-xl">
      {/* Icon */}
      <div className="mx-auto w-20 h-20 mb-5 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
        <svg
          className="w-8 h-8 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>

      {/* Title and Description */}
      <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
        📚 올해 놓친 연구과제를 확인해보세요
      </h3>
      <p className="text-gray-700 text-center mb-6 max-w-2xl mx-auto">
        2025년 초에 공고되었던 지원사업을 분석하여 내년 제안서 준비에 참고하세요.
        <br />
        유사한 과제가 2026년에 다시 나올 때 알림을 받으실 수 있습니다.
      </p>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      {/* CTA Button */}
      <div className="text-center">
        <button
          onClick={handleGenerateHistoricalMatches}
          disabled={isGenerating}
          className={`
            inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all
            ${isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg'
            }
          `}
        >
          {isGenerating ? (
            <>
              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              과거 매칭 생성 중...
            </>
          ) : (
            <>
              <svg
                className="mr-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {historicalCount !== null && historicalCount > 0
                ? `2025년 참고용 과제 ${historicalCount}개 보기`
                : '2025년 참고용 과제 보기'}
            </>
          )}
        </button>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        💡 과거 매칭 생성은 월간 무료 매칭 횟수에 포함됩니다 (FREE 플랜: 3회/월)
      </p>
    </div>
  );
}
