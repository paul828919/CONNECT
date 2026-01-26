'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SMEMatchCard, type SMEMatch } from '@/components/sme/SMEMatchCard';
import { SMEStatsBar } from '@/components/sme/SMEStatsBar';
import { SMEFilterBar, type FilterState, DEFAULT_FILTERS } from '@/components/sme/SMEFilterBar';
import { UpgradePromptModal, UpgradePromptBanner } from '@/components/upgrade-prompt-modal';
import { useMatchTracking } from '@/hooks/useMatchTracking';

// ============================================================================
// Types
// ============================================================================

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatsData {
  totalMatches: number;
  avgScore: number;
  fullyEligibleCount: number;
  urgentCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;

// ============================================================================
// Main Page Component
// ============================================================================

export default function SMEProgramsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Core state
  const [matches, setMatches] = useState<SMEMatch[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [savedFilter, setSavedFilter] = useState(false);

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [bizTypeCounts, setBizTypeCounts] = useState<Array<{ category: string; count: number; percentage: number }>>([]);

  // Subscription & upgrade state
  const [userPlan, setUserPlan] = useState<string>('FREE');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Save state
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  // Pagination
  const currentPage = parseInt(searchParams.get('page') || '1');

  // Personalization tracking
  const orgId = (session?.user as any)?.organizationId;
  const userId = session?.user?.id;
  const { createCardRef, logClick, logSave, logUnsave, isTracking } = useMatchTracking({
    organizationId: orgId,
    userId,
    listSize: matches.length,
    enabled: true,
  });
  const matchCardRefs = useRef<Map<string, (el: HTMLElement | null) => void>>(new Map());

  // Clear stale refs on match change
  useEffect(() => {
    const currentMatchIds = new Set(matches.map(m => m.id));
    matchCardRefs.current.forEach((_, matchId) => {
      if (!currentMatchIds.has(matchId)) {
        matchCardRefs.current.delete(matchId);
      }
    });
  }, [matches]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchMatches = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });

      if (savedFilter) queryParams.set('saved', 'true');
      if (filters.bizType) queryParams.set('bizType', filters.bizType);
      if (filters.eligibility) queryParams.set('eligibility', filters.eligibility);
      if (filters.region) queryParams.set('region', filters.region);
      if (filters.urgentOnly) queryParams.set('urgentOnly', 'true');
      if (filters.sort) queryParams.set('sort', filters.sort);

      const res = await fetch(`/api/sme-programs?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch matches');
        return;
      }

      setMatches(data.data.matches);
      setPagination(data.data.pagination);
    } catch (err) {
      console.error('Error fetching SME matches:', err);
      setError('지원사업 매칭을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [savedFilter, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/sme-programs/stats');
      const data = await res.json();
      if (res.ok && data.data) {
        setStats({
          totalMatches: data.data.matches?.totalMatches || 0,
          avgScore: data.data.matches?.avgScore || 0,
          fullyEligibleCount: data.data.matches?.fullyEligibleCount || 0,
          urgentCount: data.data.enhanced?.urgentDeadlineCount || 0,
        });
        setBizTypeCounts(data.data.enhanced?.topBizTypes || []);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();
      if (res.ok) {
        setUserPlan(data.plan || 'FREE');
      }
    } catch {
      // Silently fail - default to FREE
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const hasOrganization = (session.user as any)?.organizationId;
    if (!hasOrganization) {
      router.push('/dashboard/profile/create');
      return;
    }

    fetchMatches(currentPage);
    fetchStats();
    fetchSubscription();
  }, [session, status, router, currentPage, fetchMatches, fetchStats, fetchSubscription]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push('/dashboard/sme-programs?page=1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, savedFilter]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleToggleSave = async (matchId: string, currentSaved: boolean) => {
    // FREE plan: first save triggers upgrade prompt
    if (!currentSaved && userPlan === 'FREE') {
      const savedCount = matches.filter(m => m.saved).length;
      if (savedCount >= 3) {
        setShowUpgradeModal(true);
        return;
      }
    }

    try {
      setSavingMatchId(matchId);

      // Optimistic update
      setMatches(prev =>
        prev.map(m =>
          m.id === matchId ? { ...m, saved: !currentSaved } : m
        )
      );

      // Track personalization event
      const match = matches.find(m => m.id === matchId);
      const matchIndex = matches.findIndex(m => m.id === matchId);
      if (match) {
        if (!currentSaved) {
          logSave({
            programId: match.program.id,
            position: matchIndex,
            matchScore: match.score,
            source: 'sme_match_list',
          });
        } else {
          logUnsave({
            programId: match.program.id,
            position: matchIndex,
            matchScore: match.score,
            source: 'sme_match_list',
          });
        }
      }

      // API call
      const res = await fetch(`/api/sme-programs/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved: !currentSaved }),
      });

      if (!res.ok) {
        // Revert on error
        setMatches(prev =>
          prev.map(m =>
            m.id === matchId ? { ...m, saved: currentSaved } : m
          )
        );
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      // Revert on error
      setMatches(prev =>
        prev.map(m =>
          m.id === matchId ? { ...m, saved: currentSaved } : m
        )
      );
    } finally {
      setSavingMatchId(null);
    }
  };

  const handleGenerateMatches = async () => {
    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/sme-programs/generate', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '매칭 생성에 실패했습니다.');
        return;
      }

      setSuccess(data.data?.message || '새로운 매칭이 생성되었습니다.');

      // Reset filters and go to page 1
      setFilters(DEFAULT_FILTERS);
      setSavedFilter(false);
      router.push('/dashboard/sme-programs?page=1');
      await fetchMatches(1);
      await fetchStats();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Error generating SME matches:', err);
      setError('매칭 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePageClick = (pageNum: number) => {
    router.push(`/dashboard/sme-programs?page=${pageNum}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageClick(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination && currentPage < pagination.totalPages) {
      handlePageClick(currentPage + 1);
    }
  };

  // ============================================================================
  // Render helpers
  // ============================================================================

  const hasActiveFilters =
    filters.bizType !== DEFAULT_FILTERS.bizType ||
    filters.eligibility !== '' ||
    filters.region !== '' ||
    filters.urgentOnly ||
    savedFilter;

  // ============================================================================
  // Loading state (skeleton)
  // ============================================================================

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-violet-600 border-t-transparent mx-auto" />
            <p className="text-gray-600">지원사업 매칭 로딩 중...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* ================================================================ */}
        {/* Header                                                          */}
        {/* ================================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SME 지원사업 매칭</h1>
            <p className="mt-1 text-sm text-gray-500">
              기업 프로필 기반으로 맞춤 추천된 중소기업 지원사업입니다
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSavedFilter(!savedFilter)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                savedFilter
                  ? 'bg-violet-100 text-violet-700 border border-violet-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
              }`}
            >
              <svg
                className="h-4 w-4"
                fill={savedFilter ? 'currentColor' : 'none'}
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
              저장됨
            </button>
            <button
              onClick={handleGenerateMatches}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm"
            >
              {generating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  매칭 생성 중...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  새 매칭 생성
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Stats Bar                                                       */}
        {/* ================================================================ */}
        {stats && stats.totalMatches > 0 && (
          <SMEStatsBar
            stats={stats}
            bizTypeCounts={bizTypeCounts}
            activeBizType={filters.bizType}
            onBizTypeClick={(bizType) => {
              const newBizType = bizType === filters.bizType ? '' : bizType;
              handleFilterChange({ ...filters, bizType: newBizType });
            }}
          />
        )}

        {/* ================================================================ */}
        {/* Upgrade Banner (FREE plan)                                      */}
        {/* ================================================================ */}
        {userPlan === 'FREE' && matches.length > 0 && (
          <UpgradePromptBanner
            feature="Pro 플랜으로 무제한 매칭"
            description="Pro 플랜에서 무제한 매칭 생성, 저장, 실시간 알림을 이용하세요."
          />
        )}

        {/* ================================================================ */}
        {/* Filter Bar                                                      */}
        {/* ================================================================ */}
        <SMEFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* ================================================================ */}
        {/* Success Message                                                 */}
        {/* ================================================================ */}
        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* Error Message                                                   */}
        {/* ================================================================ */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ================================================================ */}
        {/* Loading Skeleton                                                */}
        {/* ================================================================ */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-gray-200 p-6 animate-pulse">
                <div className="flex gap-2 mb-3">
                  <div className="h-5 w-16 bg-gray-200 rounded" />
                  <div className="h-5 w-12 bg-gray-200 rounded" />
                </div>
                <div className="flex justify-between mb-3">
                  <div>
                    <div className="h-6 w-72 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="h-16 w-16 bg-gray-200 rounded-full" />
                </div>
                <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                <div className="h-4 w-3/4 bg-gray-100 rounded mb-4" />
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-12 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================================================================ */}
        {/* Empty State                                                     */}
        {/* ================================================================ */}
        {!loading && matches.length === 0 && (
          <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              {hasActiveFilters ? (
                <svg className="h-8 w-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {hasActiveFilters
                ? '조건에 맞는 매칭이 없습니다'
                : savedFilter
                  ? '저장된 매칭이 없습니다'
                  : '아직 매칭 결과가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-6">
              {hasActiveFilters
                ? '필터 조건을 변경하거나 초기화해보세요.'
                : savedFilter
                  ? '관심있는 지원사업을 저장해보세요.'
                  : 'SME 대시보드에서 매칭을 생성해보세요.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSavedFilter(false);
                }}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
              >
                필터 초기화
              </button>
            ) : !savedFilter ? (
              <button
                onClick={handleGenerateMatches}
                disabled={generating}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                매칭 생성하기
              </button>
            ) : null}
          </div>
        )}

        {/* ================================================================ */}
        {/* Match Cards                                                     */}
        {/* ================================================================ */}
        {!loading && matches.length > 0 && (
          <>
            {/* Result count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                전체 {pagination?.total || 0}개 중{' '}
                <span className="font-medium text-gray-700">
                  {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, pagination?.total || 0)}
                </span>
                개 표시
              </p>
            </div>

            <div className="space-y-4">
              {matches.map((match, index) => {
                // Create or get tracking ref
                if (!matchCardRefs.current.has(match.id)) {
                  matchCardRefs.current.set(match.id, createCardRef({
                    programId: match.program.id,
                    matchId: match.id,
                    position: index,
                    matchScore: match.score,
                    source: 'sme_match_list',
                  }));
                }
                const cardRef = matchCardRefs.current.get(match.id);

                return (
                  <SMEMatchCard
                    key={match.id}
                    match={match}
                    index={index}
                    onToggleSave={handleToggleSave}
                    saving={savingMatchId === match.id}
                    cardRef={cardRef}
                  />
                );
              })}
            </div>

            {/* ============================================================ */}
            {/* Pagination                                                   */}
            {/* ============================================================ */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white"
                >
                  ← 이전
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((pageNum) => {
                      return (
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        Math.abs(pageNum - currentPage) <= 1
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
                            onClick={() => handlePageClick(pageNum)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                              currentPage === pageNum
                                ? 'bg-violet-600 text-white'
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
                  disabled={currentPage === pagination.totalPages}
                  className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-white"
                >
                  다음 →
                </button>
              </div>
            )}
          </>
        )}

        {/* ================================================================ */}
        {/* Upgrade Modal                                                   */}
        {/* ================================================================ */}
        <UpgradePromptModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature="저장 제한 초과"
          description="Free 플랜에서는 최대 3개까지 저장할 수 있습니다. Pro 플랜으로 업그레이드하여 무제한 저장하세요."
          benefits={[
            '무제한 매칭 저장',
            '무제한 매칭 생성',
            '실시간 새 공고 알림',
            '맞춤 분석 리포트',
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
