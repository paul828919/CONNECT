'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

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
  };
  score: number;
  explanation: {
    summary: string;
    reasons: string[];
    warnings?: string[];
    recommendations?: string[];
  };
  createdAt: string;
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

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchMatches();
  }, [session, status, router]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        return;
      }

      const res = await fetch(`/api/matches?organizationId=${orgId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('매칭 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

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

  const formatBudget = (amount: string | null) => {
    if (!amount) return '미정';
    const num = Number(amount);
    if (num >= 100000000) return `${(num / 100000000).toFixed(0)}억원`;
    if (num >= 10000) return `${(num / 10000).toFixed(0)}만원`;
    return `${num.toLocaleString()}원`;
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '미정';
    const date = new Date(deadline);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (daysUntil < 0) return `${formatted} (마감)`;
    if (daysUntil === 0) return `${formatted} (오늘 마감)`;
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
          <h1 className="text-3xl font-bold text-gray-900">매칭 결과</h1>
          <p className="mt-2 text-gray-600">
            귀하의 조직 프로필과 적합한 지원 프로그램을 찾았습니다.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {matches.length === 0 && !error && (
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
        )}

        {/* Match Cards */}
        <div className="space-y-6">
          {matches.map((match) => (
            <div
              key={match.id}
              className="rounded-lg bg-white border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Match Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
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
                {normalizeExternalUrl(match.program.announcementUrl) ? (
                  <a
                    href={normalizeExternalUrl(match.program.announcementUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
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
            </div>
          ))}
        </div>
    </DashboardLayout>
  );
}
