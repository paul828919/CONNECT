'use client';

import { CompactEligibilityBadge } from '@/components/matches/EligibilityBadge';
import { SMEScoreRing } from './SMEScoreRing';
import { SMEScoreBreakdown } from './SMEScoreBreakdown';
import { SMEDeadlineBadge } from './SMEDeadlineBadge';
import { SMEExplanationPanel } from './SMEExplanationPanel';

// ============================================================================
// Types
// ============================================================================

export interface SMEMatch {
  id: string;
  score: number;
  eligibilityLevel: string;
  failedCriteria: string[];
  metCriteria: string[];
  scoreBreakdown: Record<string, number> | null;
  explanation: {
    summary: string;
    reasons: string[];
    warnings: string[];
    recommendations: string[];
  };
  saved: boolean;
  viewed: boolean;
  createdAt: string;
  program: {
    id: string;
    pblancSeq: number;
    title: string;
    detailBsnsNm: string | null;
    supportInstitution: string | null;
    applicationStart: string | null;
    applicationEnd: string | null;
    bizType: string | null;
    sportType: string | null;
    targetCompanyScale: string[];
    targetRegions: string[];
    requiredCerts: string[];
    minSupportAmount: string | null;
    maxSupportAmount: string | null;
    minInterestRate: string | null;
    maxInterestRate: string | null;
    detailUrl: string | null;
    applicationUrl: string | null;
    status: string;
  };
}

interface SMEMatchCardProps {
  match: SMEMatch;
  index: number;
  onToggleSave: (id: string, saved: boolean) => void;
  saving?: boolean;
  cardRef?: (el: HTMLElement | null) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function isFreshMatch(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60) <= 48;
}

function formatAmount(amount: string | null): string {
  if (!amount) return '-';
  const num = parseInt(amount);
  if (isNaN(num)) return amount;
  if (num >= 100000000) return `${Math.floor(num / 100000000)}억원`;
  if (num >= 10000) return `${Math.floor(num / 10000)}만원`;
  return `${num.toLocaleString()}원`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function getBorderColor(eligibilityLevel: string): string {
  switch (eligibilityLevel) {
    case 'FULLY_ELIGIBLE':
      return 'border-l-emerald-500';
    case 'CONDITIONALLY_ELIGIBLE':
      return 'border-l-amber-400';
    default:
      return 'border-l-gray-300';
  }
}

// ============================================================================
// Component
// ============================================================================

export function SMEMatchCard({ match, index, onToggleSave, saving, cardRef }: SMEMatchCardProps) {
  const { program, explanation } = match;

  return (
    <div
      ref={cardRef}
      id={`sme-match-${match.id}`}
      className={`
        rounded-xl bg-white border border-gray-200 border-l-4 ${getBorderColor(match.eligibilityLevel)}
        shadow-sm hover:shadow-md transition-shadow duration-200
      `}
    >
      <div className="p-5 sm:p-6">
        {/* Row 1: Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {isFreshMatch(match.createdAt) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
              ✨ New
            </span>
          )}
          {program.bizType && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">
              {program.bizType}
            </span>
          )}
          {program.targetRegions?.[0] && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {program.targetRegions[0]}
            </span>
          )}
          {program.targetCompanyScale?.[0] && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {program.targetCompanyScale[0]}
            </span>
          )}
          {program.sportType && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              {program.sportType}
            </span>
          )}
        </div>

        {/* Row 2: Title + Score ring */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug line-clamp-2">
              {program.title}
            </h3>
            {/* Institution + Eligibility */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm text-gray-500">
                {program.supportInstitution || '중소벤처기업부'}
              </span>
              <CompactEligibilityBadge
                level={match.eligibilityLevel as any}
              />
            </div>
          </div>
          <SMEScoreRing score={match.score} size={64} className="flex-shrink-0" />
        </div>

        {/* Row 3: Summary */}
        <div className="mt-3 mb-4">
          <SMEExplanationPanel explanation={explanation} />
        </div>

        {/* Row 4: Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
          {/* Support amount */}
          <div>
            <div className="text-xs text-gray-400 mb-0.5">지원금액</div>
            <div className="text-sm font-semibold text-gray-900">
              {program.maxSupportAmount
                ? `최대 ${formatAmount(program.maxSupportAmount)}`
                : program.minSupportAmount
                  ? formatAmount(program.minSupportAmount)
                  : '-'}
            </div>
          </div>
          {/* Interest rate */}
          <div>
            <div className="text-xs text-gray-400 mb-0.5">금리</div>
            <div className="text-sm font-semibold text-gray-900">
              {program.minInterestRate
                ? `${program.minInterestRate}~${program.maxInterestRate}%`
                : '-'}
            </div>
          </div>
          {/* Deadline */}
          <div>
            <div className="text-xs text-gray-400 mb-0.5">마감일</div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900">
                {formatDate(program.applicationEnd)}
              </span>
              <SMEDeadlineBadge deadline={program.applicationEnd} />
            </div>
          </div>
          {/* Certifications */}
          <div>
            <div className="text-xs text-gray-400 mb-0.5">필요인증</div>
            <div className="text-sm font-semibold text-gray-900">
              {program.requiredCerts?.length > 0
                ? program.requiredCerts.map((cert, idx) => (
                    <span key={idx} className="text-emerald-600">
                      {cert}{idx < program.requiredCerts.length - 1 ? ', ' : ''}
                    </span>
                  ))
                : <span className="text-gray-400">없음</span>}
            </div>
          </div>
        </div>

        {/* Row 5: Score breakdown */}
        <SMEScoreBreakdown breakdown={match.scoreBreakdown} className="mb-4" />

        {/* Row 6: Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {/* Save button */}
          <button
            type="button"
            onClick={() => onToggleSave(match.id, match.saved)}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              match.saved
                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${saving ? 'opacity-50 cursor-wait' : ''}`}
          >
            <svg
              className="w-4 h-4"
              fill={match.saved ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {match.saved ? '저장됨' : '저장'}
          </button>

          {/* CTA buttons */}
          <div className="flex items-center gap-2">
            {program.detailUrl && (
              <a
                href={program.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-violet-200 text-violet-700 bg-white hover:bg-violet-50 transition-colors"
              >
                상세보기
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {program.applicationUrl && (
              <a
                href={program.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
              >
                신청하기
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
