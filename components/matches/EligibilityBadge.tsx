/**
 * Eligibility Badge Component (Phase 4)
 *
 * Visual indicator for three-tier eligibility classification:
 * - FULLY_ELIGIBLE: Green badge (all requirements met)
 * - CONDITIONALLY_ELIGIBLE: Yellow badge (hard requirements met, soft requirements missing)
 * - INELIGIBLE: Hidden (filtered out before display)
 *
 * Usage:
 * ```tsx
 * <EligibilityBadge
 *   level="FULLY_ELIGIBLE"
 *   failedRequirements={[]}
 *   metRequirements={["필수 인증 보유: INNO-BIZ"]}
 * />
 * ```
 */

import React from 'react';

export type EligibilityLevel = 'FULLY_ELIGIBLE' | 'CONDITIONALLY_ELIGIBLE' | 'INELIGIBLE';

interface EligibilityBadgeProps {
  level: EligibilityLevel;
  failedRequirements?: string[];
  metRequirements?: string[];
  className?: string;
  showTooltip?: boolean;
}

export function EligibilityBadge({
  level,
  failedRequirements = [],
  metRequirements = [],
  className = '',
  showTooltip = true,
}: EligibilityBadgeProps) {
  // Get badge styling based on eligibility level
  const getBadgeStyle = () => {
    switch (level) {
      case 'FULLY_ELIGIBLE':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          icon: '✅',
          label: '완전 적합',
          description: '모든 필수 및 우대 조건 충족',
        };
      case 'CONDITIONALLY_ELIGIBLE':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          icon: '⚠️',
          label: '조건부 적합',
          description: '필수 조건 충족 (우대 조건 미충족)',
        };
      case 'INELIGIBLE':
        // Should never be displayed (filtered before rendering)
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          icon: '❌',
          label: '부적격',
          description: '필수 조건 미충족',
        };
    }
  };

  const badge = getBadgeStyle();

  if (level === 'INELIGIBLE') {
    // Defensive programming: INELIGIBLE should be hidden by algorithm
    console.warn('[EligibilityBadge] INELIGIBLE program should not be displayed');
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Badge */}
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-2 ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
        title={showTooltip ? badge.description : undefined}
      >
        <span className="mr-1.5">{badge.icon}</span>
        {badge.label}
      </span>

      {/* Tooltip (Optional detailed view) */}
      {showTooltip && (
        <div className="relative group">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="자격 요건 상세 보기"
          >
            <svg
              className="w-4 h-4"
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
          </button>

          {/* Tooltip Content (Hover) */}
          <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-xl">
            <div className="space-y-3">
              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-gray-900">{badge.description}</p>
              </div>

              {/* Met Requirements */}
              {metRequirements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">
                    ✅ 충족 조건:
                  </p>
                  <ul className="space-y-1">
                    {metRequirements.slice(0, 5).map((req, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start">
                        <span className="mr-1.5 text-green-600">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                    {metRequirements.length > 5 && (
                      <li className="text-xs text-gray-500 italic">
                        외 {metRequirements.length - 5}건...
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Failed Requirements (for CONDITIONALLY_ELIGIBLE) */}
              {level === 'CONDITIONALLY_ELIGIBLE' && failedRequirements.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-700 mb-1">
                    ⚠️ 미충족 우대 조건:
                  </p>
                  <ul className="space-y-1">
                    {failedRequirements.slice(0, 3).map((req, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start">
                        <span className="mr-1.5 text-yellow-600">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                    {failedRequirements.length > 3 && (
                      <li className="text-xs text-gray-500 italic">
                        외 {failedRequirements.length - 3}건...
                      </li>
                    )}
                  </ul>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    💡 우대 조건 미충족 시에도 지원 가능하나, 선정 확률이 낮을 수 있습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Eligibility Badge (for list views)
 */
export function CompactEligibilityBadge({ level }: { level: EligibilityLevel }) {
  if (level === 'INELIGIBLE') {
    return null;
  }

  const isFullyEligible = level === 'FULLY_ELIGIBLE';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
        isFullyEligible
          ? 'bg-green-100 text-green-800 border border-green-300'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      }`}
      title={
        isFullyEligible
          ? '모든 조건 충족 (완전 적합)'
          : '필수 조건만 충족 (조건부 적합)'
      }
    >
      {isFullyEligible ? '✅' : '⚠️'} {isFullyEligible ? '완전 적합' : '조건부'}
    </span>
  );
}
