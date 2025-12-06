'use client';

import Link from 'next/link';

interface MatchReadinessAlertProps {
  organization: {
    keyTechnologies: string[] | null;
    researchFocusAreas: string[] | null;
    industrySector: string | null;
  };
}

/**
 * MatchReadinessAlert Component
 *
 * Shows a prominent alert when critical matching fields are empty.
 * Encourages users to complete their profile for better match quality.
 *
 * Displays when:
 * - keyTechnologies is empty OR
 * - researchFocusAreas is empty
 */
export function MatchReadinessAlert({ organization }: MatchReadinessAlertProps) {
  const hasKeyTechnologies = organization.keyTechnologies && organization.keyTechnologies.length > 0;
  const hasResearchFocusAreas = organization.researchFocusAreas && organization.researchFocusAreas.length > 0;

  // Don't show alert if both fields are populated
  if (hasKeyTechnologies && hasResearchFocusAreas) {
    return null;
  }

  // Determine which fields are missing for the message
  const missingFields: string[] = [];
  if (!hasResearchFocusAreas) missingFields.push('연구 분야');
  if (!hasKeyTechnologies) missingFields.push('핵심 기술');

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
      <div className="flex items-start gap-3">
        {/* LightBulb Icon */}
        <svg
          className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <div className="flex-1">
          <h4 className="font-medium text-amber-800">매칭 품질을 높이세요</h4>
          <p className="text-sm text-amber-700 mt-1">
            {missingFields.join('와 ')}을 입력하면 귀사에 더 적합한 연구 과제를 추천받을 수 있습니다.
          </p>
          <Link
            href="/dashboard/profile/edit"
            className="inline-flex items-center mt-3 text-sm font-medium text-amber-800 hover:text-amber-900"
          >
            프로필 완성하기
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MatchReadinessAlert;
