'use client';

import { useState } from 'react';

interface SMEExplanationPanelProps {
  explanation: {
    summary: string;
    reasons: string[];
    warnings: string[];
    recommendations: string[];
  };
  defaultExpanded?: boolean;
  className?: string;
}

export function SMEExplanationPanel({
  explanation,
  defaultExpanded = false,
  className = '',
}: SMEExplanationPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const hasDetails =
    explanation.reasons.length > 0 ||
    explanation.warnings.length > 0 ||
    explanation.recommendations.length > 0;

  return (
    <div className={className}>
      {/* Summary — always visible */}
      <p className="text-sm text-gray-600 leading-relaxed">{explanation.summary}</p>

      {/* Expand toggle */}
      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? '설명 접기' : '상세 설명 보기'}
          </button>

          {/* Expandable details */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4">
              {/* Reasons */}
              {explanation.reasons.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1.5">✓ 적합 이유</p>
                  <ul className="space-y-1">
                    {explanation.reasons.map((reason, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {explanation.warnings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1.5">⚠ 주의사항</p>
                  <ul className="space-y-1">
                    {explanation.warnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {explanation.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-1.5">💡 권장사항</p>
                  <ul className="space-y-1">
                    {explanation.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
