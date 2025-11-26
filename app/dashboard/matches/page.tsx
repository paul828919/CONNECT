'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { MatchExplanation } from '@/components/match-explanation';
import { HistoricalMatchesPrompt } from '@/components/HistoricalMatchesPrompt';
import { EligibilityBadge, type EligibilityLevel } from '@/components/matches/EligibilityBadge';
import { EligibilityConfidenceAlert, type ConfidenceLevel } from '@/components/matches/EligibilityConfidenceAlert';
import { InvestmentPrompt } from '@/components/profile/InvestmentPrompt';

interface Match {
  id: string;
  program: {
    id: string;
    title: string;
    description: string | null;
    agencyId: string;
    category: string | null;
    budgetAmount: string | null;
    deadline: string | null;
    announcementUrl: string;
    status?: string; // Add status field for EXPIRED detection
    manualReviewRequired?: boolean; // Programs requiring manual announcement verification
    manualReviewNotes?: string | null; // Notes explaining why manual review is needed
    eligibilityConfidence?: ConfidenceLevel; // Eligibility extraction confidence (HIGH, MEDIUM, LOW)
  };
  score: number;
  explanation: {
    summary: string;
    reasons: string[];
    warnings?: string[];
    recommendations?: string[];
  };
  isExpired?: boolean; // Flag for historical matches
  createdAt: string;
  // Phase 4: Eligibility information
  eligibilityLevel?: EligibilityLevel;
  eligibilityDetails?: {
    hardRequirementsMet: boolean;
    softRequirementsMet: boolean;
    failedRequirements: string[];
    metRequirements: string[];
    needsManualReview: boolean;
    manualReviewReason?: string;
  };
}

const agencyNames: Record<string, string> = {
  IITP: '정보통신기획평가원',
  KEIT: '한국산업기술평가관리원',
  TIPA: '중소기업기술정보진흥원',
  KIMST: '해양수산과학기술진흥원',
};

/**
 * Validate and normalize external URL
 * Defensive programming: Ensures relative URLs are never rendered
 */
const normalizeExternalUrl = (url: string): string | null => {
  if (!url) return null;

  // Valid absolute URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Invalid relative URL - return null to disable link
  console.warn('[URL Validation] Relative URL detected:', url);
  return null;
};

export default function MatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [historicalMatches, setHistoricalMatches] = useState<Match[]>([]);
  const [showHistorical, setShowHistorical] = useState(false);
  // Phase 4: Track investment verification needs
  const [needsInvestmentVerification, setNeedsInvestmentVerification] = useState(false);
  const [hasInvestmentHistory, setHasInvestmentHistory] = useState(false);
  const [requiredInvestmentAmount, setRequiredInvestmentAmount] = useState<number | undefined>();
  // Stage 2.1: Force regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false);
  // Pagination state (for both active and historical matches)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);
  const [historicalCurrentPage, setHistoricalCurrentPage] = useState(1);
  const [historicalTotalPages, setHistoricalTotalPages] = useState(1);
  const [historicalTotalMatches, setHistoricalTotalMatches] = useState(0);
  const itemsPerPage = 10;

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        return;
      }

      const res = await fetch(
        `/api/matches?organizationId=${orgId}&page=${currentPage}&limit=${itemsPerPage}`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await res.json();
      setMatches(data.matches || []);

      // Update pagination metadata
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalMatches(data.pagination.totalMatches);
      }

      // OPTION A: Auto-load historical matches when no active matches found
      if (!data.matches || data.matches.length === 0) {
        console.log('No active matches found. Auto-loading historical matches...');
        await fetchHistoricalMatches();
      }

      // Phase 4: Check if any matches need investment verification
      const matchesNeedingInvestment = (data.matches || []).filter(
        (m: Match) =>
          m.eligibilityDetails?.failedRequirements?.some((req: string) =>
            req.includes('투자 유치')
          )
      );

      if (matchesNeedingInvestment.length > 0) {
        setNeedsInvestmentVerification(true);

        // Extract required investment amount from failed requirement
        const firstMatch = matchesNeedingInvestment[0];
        const investmentReq = firstMatch.eligibilityDetails?.failedRequirements?.find(
          (req: string) => req.includes('투자 유치')
        );
        if (investmentReq) {
          // Parse amount from string like "투자 유치 실적 미확인 (필요: ₩200,000,000)"
          const amountMatch = investmentReq.match(/₩([\d,]+)/);
          if (amountMatch) {
            const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
            setRequiredInvestmentAmount(amount);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('매칭 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [session, currentPage, itemsPerPage]);

  const fetchHistoricalMatches = useCallback(async () => {
    try {
      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        return;
      }

      const res = await fetch(
        `/api/matches/historical?organizationId=${orgId}&page=${historicalCurrentPage}&limit=${itemsPerPage}`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch historical matches');
      }

      const data = await res.json();
      setHistoricalMatches(data.matches || []);
      setShowHistorical(true);

      // Update pagination metadata for historical matches
      if (data.pagination) {
        setHistoricalTotalPages(data.pagination.totalPages);
        setHistoricalTotalMatches(data.pagination.totalMatches);
      }
    } catch (err) {
      console.error('Error fetching historical matches:', err);
    }
  }, [session, historicalCurrentPage, itemsPerPage]);

  // Pagination handlers for active matches
  const handlePageClick = (pageNum: number) => {
    setCurrentPage(pageNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Pagination handlers for historical matches
  const handleHistoricalPageClick = (pageNum: number) => {
    setHistoricalCurrentPage(pageNum);
    document.getElementById('historical-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleHistoricalPreviousPage = () => {
    if (historicalCurrentPage > 1) {
      setHistoricalCurrentPage(historicalCurrentPage - 1);
      document.getElementById('historical-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHistoricalNextPage = () => {
    if (historicalCurrentPage < historicalTotalPages) {
      setHistoricalCurrentPage(historicalCurrentPage + 1);
      document.getElementById('historical-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Stage 2.1: Force regenerate matches (clears cache + deletes old matches)
  const handleRegenerateMatches = useCallback(async () => {
    try {
      setIsRegenerating(true);
      setError(null);

      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        return;
      }

      const res = await fetch(
        `/api/matches/generate?organizationId=${orgId}&forceRegenerate=true`,
        { method: 'POST' }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to regenerate matches');
      }

      // Success - reload matches (reset to page 1)
      setCurrentPage(1);
      await fetchMatches();
    } catch (err) {
      console.error('Error regenerating matches:', err);
      setError('매칭 재생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsRegenerating(false);
    }
  }, [session, fetchMatches]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchMatches();
  }, [session, status, router, fetchMatches]);

  // Refetch historical matches when historical page changes
  useEffect(() => {
    if (showHistorical && historicalCurrentPage > 1) {
      fetchHistoricalMatches();
    }
  }, [historicalCurrentPage, showHistorical, fetchHistoricalMatches]);

  // Scroll restoration: Handle hash anchors after component renders
  useEffect(() => {
    // Only proceed if there's a hash in the URL
    if (!window.location.hash) return;

    // Wait for React to finish rendering (especially important for dynamically loaded content)
    const timeoutId = setTimeout(() => {
      const hash = window.location.hash.substring(1); // Remove the '#'
      const element = document.getElementById(hash);

      if (element) {
        // Instant scroll to the target element (no animation)
        element.scrollIntoView({
          behavior: 'auto',
          block: 'center', // Center the element in the viewport
        });
      }
    }, 300); // 300ms delay to ensure DOM is ready

    return () => clearTimeout(timeoutId);
  }, [matches, historicalMatches]); // Re-run when matches data changes

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '매우 적합';
    if (score >= 60) return '적합';
    if (score >= 40) return '검토 권장';
    return '참고용';
  };

  // Stage 2.3: Check if match is "fresh" (created within 48 hours)
  const isFreshMatch = (createdAt: string): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 48;
  };

  const formatBudget = (amount: string | null) => {
    // Enhanced NULL value display with Korean message
    if (!amount) return '💰 미정 (공고문 확인 필요)';
    const num = Number(amount);
    if (num >= 100000000) return `${(num / 100000000).toFixed(0)}억원`;
    if (num >= 10000) return `${(num / 10000).toFixed(0)}만원`;
    return `${num.toLocaleString()}원`;
  };

  const formatDeadline = (deadline: string | null) => {
    // Enhanced NULL value display with Korean message
    if (!deadline) return '📅 추후 공고 (공지 예정)';
    const date = new Date(deadline);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Enhanced past deadline display with Korean message
    if (daysUntil < 0) return `⏰ ${formatted} (마감 - 내년 준비용)`;
    if (daysUntil === 0) return `${formatted} (오늘 마감 🔥)`;
    if (daysUntil <= 7) return `${formatted} (${daysUntil}일 남음 ⚠️)`;
    return `${formatted} (${daysUntil}일 남음)`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">매칭 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">매칭 결과</h1>
              <p className="mt-2 text-gray-600">
                귀하의 조직 프로필과 적합한 지원 프로그램을 찾았습니다.
              </p>
            </div>
            {matches.length > 0 && (
              <button
                onClick={handleRegenerateMatches}
                disabled={isRegenerating}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <>
                    <svg
                      className="mr-2 w-4 h-4 animate-spin"
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
                    재생성 중...
                  </>
                ) : (
                  <>
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    매칭 재생성
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {matches.length === 0 && !error && (
          <>
            <div className="rounded-lg bg-white border border-gray-200 p-12 text-center">
              <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
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
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                아직 매칭 결과가 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                대시보드에서 &quot;매칭 생성하기&quot;를 클릭하여 적합한 프로그램을 찾아보세요.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                대시보드로 이동
              </Link>
            </div>

            {/* Historical Matches Prompt (shown when no current matches) */}
            {(session?.user as any)?.organizationId && (
              <HistoricalMatchesPrompt
                organizationId={(session?.user as any).organizationId}
                onViewHistoricalMatches={fetchHistoricalMatches}
              />
            )}
          </>
        )}

        {/* Phase 4: Investment Verification Prompt (Conditional) */}
        {(session?.user as any)?.organizationId && matches.length > 0 && (
          <InvestmentPrompt
            organizationId={(session?.user as any).organizationId}
            hasInvestmentHistory={hasInvestmentHistory}
            needsInvestmentVerification={needsInvestmentVerification}
            requiredInvestmentAmount={requiredInvestmentAmount}
          />
        )}

        {/* Current Match Cards */}
        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match.id}
              id={`match-${match.id}`}
              className="rounded-lg bg-white border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Match Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {/* Phase 4: Eligibility Badge (Priority Display) */}
                    {match.eligibilityLevel && (
                      <EligibilityBadge
                        level={match.eligibilityLevel}
                        failedRequirements={match.eligibilityDetails?.failedRequirements}
                        metRequirements={match.eligibilityDetails?.metRequirements}
                        showTooltip={true}
                      />
                    )}
                    {/* Stage 2.3: Fresh Match Badge (New within 48h) */}
                    {isFreshMatch(match.createdAt) && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700 border-2 border-green-300">
                        ✨ New
                      </span>
                    )}
                    <h2 className="text-xl font-bold text-gray-900">
                      {match.program.title}
                    </h2>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(
                        match.score
                      )}`}
                    >
                      {getScoreLabel(match.score)} ({match.score}점)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium">
                      {agencyNames[match.program.agencyId] || match.program.agencyId}
                    </span>
                    {match.program.category && (
                      <>
                        <span>•</span>
                        <span>{match.program.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Eligibility Confidence Alert (for MEDIUM and LOW confidence programs) */}
              {match.program.eligibilityConfidence && (
                <EligibilityConfidenceAlert
                  confidence={match.program.eligibilityConfidence}
                  announcementUrl={match.program.announcementUrl}
                />
              )}

              {/* Program Details */}
              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">지원 규모</p>
                  <p className="font-semibold text-gray-900">
                    {formatBudget(match.program.budgetAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">신청 마감</p>
                  <p className="font-semibold text-gray-900">
                    {formatDeadline(match.program.deadline)}
                  </p>
                </div>
              </div>

              {/* Explanation */}
              <div className="mb-4">
                <p className="text-gray-700 mb-3">{match.explanation.summary}</p>

                {match.explanation.reasons && match.explanation.reasons.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-900 mb-2">✓ 적합한 이유:</p>
                    <ul className="space-y-1">
                      {match.explanation.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {match.explanation.warnings && match.explanation.warnings.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-yellow-700 mb-2">⚠ 주의사항:</p>
                    <ul className="space-y-1">
                      {match.explanation.warnings.map((warning, idx) => (
                        <li key={idx} className="text-sm text-yellow-700 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{warning}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {match.explanation.recommendations && match.explanation.recommendations.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-blue-700 mb-2">💡 권장사항:</p>
                    <ul className="space-y-1">
                      {match.explanation.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-blue-700 flex items-start">
                          <span className="mr-2">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  {expandedMatchId === match.id ? 'AI 설명 닫기' : 'AI 설명 보기'}
                </button>
                {normalizeExternalUrl(match.program.announcementUrl) ? (
                  <a
                    href={normalizeExternalUrl(match.program.announcementUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      window.location.hash = `match-${match.id}`;
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    공고 확인하기
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
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                    title="공고 URL이 유효하지 않습니다"
                  >
                    공고 확인하기
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
                  </button>
                )}
                <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  북마크
                </button>
              </div>

              {/* AI Explanation (Expandable) */}
              {expandedMatchId === match.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <MatchExplanation matchId={match.id} autoLoad={true} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination Controls for Active Matches */}
        {matches.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white"
            >
              ← 이전
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((pageNum) => {
                  // Show: first page, last page, current page, and pages within 1 of current
                  return (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1
                  );
                })
                .map((pageNum, idx, arr) => {
                  // Add ellipsis if there's a gap
                  const prevPageNum = arr[idx - 1];
                  const showEllipsis = prevPageNum && pageNum - prevPageNum > 1;

                  return (
                    <div key={pageNum} className="flex items-center gap-1">
                      {showEllipsis && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => handlePageClick(pageNum)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white"
            >
              다음 →
            </button>
          </div>
        )}

        {/* Pagination Info */}
        {matches.length > 0 && totalMatches > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            전체 {totalMatches}개 중 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalMatches)}개 표시
          </div>
        )}

        {/* Historical Matches Section (with visual distinction) */}
        {showHistorical && historicalMatches.length > 0 && (
          <div className="mt-12" id="historical-section">
            {/* Section Header with Clear Separation */}
            <div className="mb-6 p-4 bg-purple-50 border-l-4 border-purple-600 rounded">
              <div className="flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-purple-600"
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
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    📚 2025년 참고용 과제 (마감됨)
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    올해 초 공고된 프로그램을 분석하여 2026년 제안서 준비에 활용하세요
                  </p>
                </div>
              </div>
            </div>

            {/* Historical Match Cards with Visual Distinction */}
            <div className="space-y-6">
              {historicalMatches.map((match) => (
                <div
                  key={match.id}
                  id={`historical-match-${match.id}`}
                  className="rounded-lg bg-white border-2 border-purple-200 p-6 opacity-90 hover:opacity-100 transition-opacity"
                >
                  {/* Match Header with EXPIRED Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* RED EXPIRED BADGE - High Visibility */}
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 border-2 border-red-300">
                          🔴 마감됨
                        </span>
                        <h2 className="text-xl font-bold text-gray-700">
                          {match.program.title}
                        </h2>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getScoreColor(
                            match.score
                          )}`}
                        >
                          {getScoreLabel(match.score)} ({match.score}점)
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-medium">
                          {agencyNames[match.program.agencyId] || match.program.agencyId}
                        </span>
                        {match.program.category && (
                          <>
                            <span>•</span>
                            <span>{match.program.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Eligibility Confidence Alert (for MEDIUM and LOW confidence historical programs) */}
                  {match.program.eligibilityConfidence && (
                    <EligibilityConfidenceAlert
                      confidence={match.program.eligibilityConfidence}
                      announcementUrl={match.program.announcementUrl}
                    />
                  )}

                  {/* Program Details with Strikethrough Deadline */}
                  <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div>
                      <p className="text-sm text-gray-600">지원 규모</p>
                      <p className="font-semibold text-gray-700">
                        {formatBudget(match.program.budgetAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">신청 마감 (지난 날짜)</p>
                      {/* Strikethrough Deadline - Visual Cue for EXPIRED */}
                      <p className="font-semibold text-gray-500 line-through">
                        {formatDeadline(match.program.deadline)}
                      </p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="mb-4">
                    <p className="text-gray-600 mb-3">{match.explanation.summary}</p>

                    {match.explanation.reasons && match.explanation.reasons.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-800 mb-2">✓ 적합한 이유:</p>
                        <ul className="space-y-1">
                          {match.explanation.reasons.map((reason, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start">
                              <span className="mr-2">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.explanation.warnings && match.explanation.warnings.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-yellow-700 mb-2">⚠ 주의사항:</p>
                        <ul className="space-y-1">
                          {match.explanation.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm text-yellow-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {match.explanation.recommendations && match.explanation.recommendations.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-blue-700 mb-2">💡 권장사항:</p>
                        <ul className="space-y-1">
                          {match.explanation.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-blue-700 flex items-start">
                              <span className="mr-2">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions with Different CTA */}
                  <div className="flex items-center gap-3 pt-4 border-t border-purple-200">
                    <button
                      onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                      className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                      {expandedMatchId === match.id ? 'AI 설명 닫기' : 'AI 설명 보기'}
                    </button>

                    {/* Different CTA: "Study for 2026" instead of "Apply Now" */}
                    {normalizeExternalUrl(match.program.announcementUrl) ? (
                      <a
                        href={normalizeExternalUrl(match.program.announcementUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          window.location.hash = `historical-match-${match.id}`;
                        }}
                        className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 border-2 border-purple-300 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        📖 2026년 준비용으로 학습
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
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-400 rounded-lg cursor-not-allowed"
                        title="공고 URL이 유효하지 않습니다"
                      >
                        📖 2026년 준비용으로 학습
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
                      </button>
                    )}
                    <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      북마크
                    </button>
                  </div>

                  {/* AI Explanation (Expandable) */}
                  {expandedMatchId === match.id && (
                    <div className="mt-6 pt-6 border-t border-purple-200">
                      <MatchExplanation matchId={match.id} autoLoad={true} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls for Historical Matches */}
            {historicalTotalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={handleHistoricalPreviousPage}
                  disabled={historicalCurrentPage === 1}
                  className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:hover:bg-white"
                >
                  ← 이전
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: historicalTotalPages }, (_, i) => i + 1)
                    .filter((pageNum) => {
                      return (
                        pageNum === 1 ||
                        pageNum === historicalTotalPages ||
                        Math.abs(pageNum - historicalCurrentPage) <= 1
                      );
                    })
                    .map((pageNum, idx, arr) => {
                      const prevPageNum = arr[idx - 1];
                      const showEllipsis = prevPageNum && pageNum - prevPageNum > 1;

                      return (
                        <div key={pageNum} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => handleHistoricalPageClick(pageNum)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              historicalCurrentPage === pageNum
                                ? 'bg-purple-600 text-white'
                                : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  onClick={handleHistoricalNextPage}
                  disabled={historicalCurrentPage === historicalTotalPages}
                  className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:hover:bg-white"
                >
                  다음 →
                </button>
              </div>
            )}

            {/* Pagination Info for Historical */}
            {historicalTotalMatches > 0 && (
              <div className="mt-4 text-center text-sm text-purple-700">
                전체 {historicalTotalMatches}개 중 {((historicalCurrentPage - 1) * itemsPerPage) + 1} - {Math.min(historicalCurrentPage * itemsPerPage, historicalTotalMatches)}개 표시
              </div>
            )}

            {/* Info Box at Bottom */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 mt-0.5"
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
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    💡 과거 과제 활용 팁
                  </p>
                  <p className="text-sm text-blue-800">
                    • 과거 공고문을 분석하여 평가 기준과 선정 방향을 파악하세요<br />
                    • 유사한 과제가 2026년에 다시 나올 때 빠르게 제안서를 준비할 수 있습니다<br />
                    • 북마크하여 나중에 다시 참고하세요
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
    </DashboardLayout>
  );
}
