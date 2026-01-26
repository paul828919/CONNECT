'use client';

import { useState } from 'react';

interface SMEScoreBreakdownProps {
  breakdown: Record<string, number> | null;
  className?: string;
}

interface DimensionConfig {
  key: string;
  label: string;
  max: number;
  category: 'eligibility' | 'relevance';
}

const DIMENSIONS: DimensionConfig[] = [
  // Relevance (sorted by max weight for visual hierarchy)
  { key: 'industryContent', label: '산업관련성', max: 30, category: 'relevance' },
  { key: 'bizType', label: '사업유형', max: 28, category: 'relevance' },
  { key: 'deadline', label: '마감긴급도', max: 15, category: 'relevance' },
  // Eligibility
  { key: 'companyScale', label: '기업규모', max: 20, category: 'eligibility' },
  { key: 'revenueRange', label: '매출규모', max: 15, category: 'eligibility' },
  { key: 'employeeCount', label: '직원수', max: 10, category: 'eligibility' },
  { key: 'businessAge', label: '업력', max: 10, category: 'eligibility' },
  { key: 'region', label: '지역', max: 10, category: 'eligibility' },
  { key: 'certifications', label: '인증', max: 5, category: 'eligibility' },
  // Minor relevance
  { key: 'sportType', label: '지원유형', max: 3, category: 'relevance' },
  { key: 'lifecycle', label: '생애주기', max: 2, category: 'relevance' },
  { key: 'financialRelevance', label: '금융관련성', max: 2, category: 'relevance' },
];

function getBarColor(ratio: number): string {
  if (ratio >= 0.8) return 'bg-emerald-500';
  if (ratio >= 0.5) return 'bg-violet-500';
  if (ratio >= 0.25) return 'bg-amber-400';
  return 'bg-gray-300';
}

export function SMEScoreBreakdown({ breakdown, className = '' }: SMEScoreBreakdownProps) {
  const [expanded, setExpanded] = useState(false);

  if (!breakdown) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-violet-700 hover:text-violet-900 transition-colors group"
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>점수 상세 분석</span>
        <span className="text-xs text-gray-400 font-normal">12개 차원</span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-2.5">
          {DIMENSIONS.map((dim) => {
            const value = breakdown[dim.key] ?? 0;
            const ratio = dim.max > 0 ? value / dim.max : 0;
            const percentage = Math.round(ratio * 100);

            return (
              <div key={dim.key} className="flex items-center gap-3">
                {/* Label */}
                <span className="text-xs text-gray-600 w-[72px] flex-shrink-0 text-right tabular-nums">
                  {dim.label}
                </span>
                {/* Bar track */}
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarColor(ratio)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                {/* Value */}
                <span className="text-xs text-gray-500 w-[52px] flex-shrink-0 tabular-nums">
                  {value}/{dim.max}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
