/**
 * Eligibility Confidence Alert Component
 *
 * Displays appropriate UI based on eligibility extraction confidence level:
 * - HIGH: No alert shown (extracted criteria are reliable)
 * - MEDIUM: Info banner prompting user to verify in original announcement
 * - LOW: Warning banner directing user to contact program manager
 *
 * Purpose: Communicate eligibility information reliability to users without
 * requiring manual admin review of each program.
 */

import React from 'react';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface EligibilityConfidenceAlertProps {
  confidence: ConfidenceLevel;
  announcementUrl: string;
  className?: string;
}

/**
 * Validate and normalize external URL
 */
const normalizeExternalUrl = (url: string): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return null;
};

export function EligibilityConfidenceAlert({
  confidence,
  announcementUrl,
  className = '',
}: EligibilityConfidenceAlertProps) {
  const validUrl = normalizeExternalUrl(announcementUrl);

  // HIGH confidence: No alert needed
  if (confidence === 'HIGH') {
    return null;
  }

  // MEDIUM confidence: Info banner with verification prompt
  if (confidence === 'MEDIUM') {
    return (
      <div className={`mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg ${className}`}>
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-800">
              ℹ️ 공고문 내용을 직접 재확인해 주세요.
            </p>
            {validUrl && (
              <a
                href={validUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center mt-2 text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
              >
                원본 공고 보기
                <svg
                  className="ml-1 w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LOW confidence: Warning banner with program manager contact guidance
  return (
    <div className={`mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg ${className}`}>
      <div className="flex items-start gap-3">
        <svg
          className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900 mb-1">
            ⚠️ 이 연구과제는 자격 요건이 복잡하여 지원자 확인이 필요합니다.
          </p>
          <p className="text-sm text-amber-800 mb-3">
            공고문 내 담당 과제관리자에게 직접 확인해 주세요.
          </p>
          {validUrl && (
            <a
              href={validUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg
                className="mr-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              원본 공고에서 담당자 확인하기
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default EligibilityConfidenceAlert;
