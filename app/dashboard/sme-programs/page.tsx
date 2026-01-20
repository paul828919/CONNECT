'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface SMEMatch {
  id: string;
  score: number;
  eligibilityLevel: string;
  failedCriteria: string[];
  metCriteria: string[];
  explanation: {
    summary: string;
    reasons: string[];
    warnings: string[];
    recommendations: string[];
  };
  saved: boolean;
  viewed: boolean;
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SMEProgramsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matches, setMatches] = useState<SMEMatch[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedFilter, setSavedFilter] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');

  const fetchMatches = useCallback(async (page: number, saved: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (saved) {
        queryParams.set('saved', 'true');
      }

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
  }, []);

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

    fetchMatches(currentPage, savedFilter);
  }, [session, status, router, currentPage, savedFilter, fetchMatches]);

  const handleToggleSave = async (matchId: string, currentSaved: boolean) => {
    try {
      // Optimistic update
      setMatches(prev =>
        prev.map(m =>
          m.id === matchId ? { ...m, saved: !currentSaved } : m
        )
      );

      // TODO: Implement save/unsave API endpoint
      // For now, this is just UI feedback
    } catch (err) {
      console.error('Error toggling save:', err);
      // Revert on error
      setMatches(prev =>
        prev.map(m =>
          m.id === matchId ? { ...m, saved: currentSaved } : m
        )
      );
    }
  };

  const formatAmount = (amount: string | null): string => {
    if (!amount) return '-';
    const num = parseInt(amount);
    if (isNaN(num)) return amount;
    if (num >= 100000000) {
      return `${Math.floor(num / 100000000)}억원`;
    }
    if (num >= 10000) {
      return `${Math.floor(num / 10000)}만원`;
    }
    return `${num}원`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDaysUntilDeadline = (deadline: string | null): number | null => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return '매우 적합';
    if (score >= 60) return '적합';
    if (score >= 40) return '부분 적합';
    return '확인 필요';
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto"></div>
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SME 지원사업 매칭 결과</h1>
            <p className="mt-1 text-sm text-gray-500">
              {pagination ? `총 ${pagination.total}개의 매칭` : '로딩 중...'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSavedFilter(!savedFilter)}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                savedFilter
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="mr-2 h-4 w-4" fill={savedFilter ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              저장됨만
            </button>
            <Link
              href="/dashboard/sme"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              새 매칭 생성
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {matches.length === 0 && !loading && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {savedFilter ? '저장된 매칭이 없습니다' : '아직 매칭 결과가 없습니다'}
            </h3>
            <p className="text-gray-500 mb-6">
              {savedFilter
                ? '관심있는 지원사업을 저장해보세요.'
                : 'SME 대시보드에서 매칭을 생성해보세요.'}
            </p>
            {!savedFilter && (
              <Link
                href="/dashboard/sme"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
              >
                매칭 생성하기
              </Link>
            )}
          </div>
        )}

        {/* Match Cards */}
        <div className="space-y-4">
          {matches.map((match) => {
            const daysLeft = getDaysUntilDeadline(match.program.applicationEnd);
            const isUrgent = daysLeft !== null && daysLeft <= 7;

            return (
              <div
                key={match.id}
                className={`rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 ${
                  match.eligibilityLevel === 'FULLY_ELIGIBLE'
                    ? 'border-green-500'
                    : 'border-yellow-500'
                }`}
              >
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {match.program.targetCompanyScale?.[0] && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      🏢 {match.program.targetCompanyScale[0]}
                    </span>
                  )}
                  {match.program.bizType && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      💰 {match.program.bizType}
                    </span>
                  )}
                  {match.program.targetRegions?.[0] && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      📍 {match.program.targetRegions[0]}
                    </span>
                  )}
                  {isUrgent && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      🔥 D-{daysLeft}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {match.program.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {match.program.supportInstitution || '중소벤처기업부'}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  {match.program.maxSupportAmount && (
                    <div>
                      <div className="text-xs text-gray-500">지원금액</div>
                      <div className="text-sm font-medium text-gray-900">
                        최대 {formatAmount(match.program.maxSupportAmount)}
                      </div>
                    </div>
                  )}
                  {match.program.minInterestRate && (
                    <div>
                      <div className="text-xs text-gray-500">금리</div>
                      <div className="text-sm font-medium text-gray-900">
                        {match.program.minInterestRate}~{match.program.maxInterestRate}%
                      </div>
                    </div>
                  )}
                  {match.program.requiredCerts?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500">필요 인증</div>
                      <div className="text-sm font-medium text-gray-900">
                        {match.program.requiredCerts.map((cert, idx) => (
                          <span key={idx} className="text-green-600">
                            ✅ {cert}{idx < match.program.requiredCerts.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">마감</div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(match.program.applicationEnd)}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(match.score)}`}>
                      {match.score}점 {getScoreLabel(match.score)}
                    </span>
                    {match.eligibilityLevel === 'FULLY_ELIGIBLE' && (
                      <span className="text-xs text-green-600 font-medium">
                        ✓ 자격 충족
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSave(match.id, match.saved)}
                      className={`p-2 rounded-lg transition-colors ${
                        match.saved
                          ? 'text-purple-600 bg-purple-50'
                          : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill={match.saved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    {match.program.detailUrl && (
                      <a
                        href={match.program.detailUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        상세보기
                        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            <button
              onClick={() => router.push(`/dashboard/sme-programs?page=${Math.max(1, currentPage - 1)}`)}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-sm text-gray-600">
              {currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => router.push(`/dashboard/sme-programs?page=${Math.min(pagination.totalPages, currentPage + 1)}`)}
              disabled={currentPage === pagination.totalPages}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
