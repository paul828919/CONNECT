'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

// ============================================================================
// Types
// ============================================================================

type ImprovementCategory =
  | 'certification'
  | 'investment'
  | 'patent'
  | 'personnel'
  | 'infrastructure'
  | 'track_record';

type Priority = 'high' | 'medium' | 'low';

interface ImprovementSuggestion {
  id: string;
  category: ImprovementCategory;
  title: string;
  description: string;
  detailedDescription: string;
  impactedPrograms: number;
  totalPrograms: number;
  priority: Priority;
  actionUrl?: string;
  actionLabel?: string;
  affectedProgramIds: string[];
}

interface ProfileGap {
  field: string;
  fieldLabel: string;
  currentValue: string | null;
  recommendation: string;
  profileEditUrl: string;
}

interface CompetitivenessAnalysisData {
  overallScore: number;
  totalMatches: number;
  fullyEligibleCount: number;
  conditionallyEligibleCount: number;
  improvements: ImprovementSuggestion[];
  profileGaps: ProfileGap[];
  lastAnalyzedAt: string;
}

// ============================================================================
// Helper Components
// ============================================================================

function PriorityBadge({ priority }: { priority: Priority }) {
  const config = {
    high: {
      label: '높음',
      className: 'bg-red-50 text-red-700 border-red-200',
      icon: '🔴',
    },
    medium: {
      label: '중간',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      icon: '🟡',
    },
    low: {
      label: '낮음',
      className: 'bg-green-50 text-green-700 border-green-200',
      icon: '🟢',
    },
  };

  const { label, className, icon } = config[priority];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}
    >
      {icon} {label}
    </span>
  );
}

function ScoreProgress({ score }: { score: number }) {
  const getColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full">
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ImprovementCard({ suggestion }: { suggestion: ImprovementSuggestion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <PriorityBadge priority={suggestion.priority} />
            <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>

          {expanded && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{suggestion.detailedDescription}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-2">
          {suggestion.actionUrl && (
            <a
              href={suggestion.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {suggestion.actionLabel || '자세히 보기'}
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {expanded ? '접기' : '자세히 보기'}
        </button>
      </div>
    </div>
  );
}

function ProfileGapCard({ gap }: { gap: ProfileGap }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{gap.fieldLabel}</p>
        <p className="text-xs text-gray-500 mt-0.5">{gap.recommendation}</p>
      </div>
      <Link
        href={gap.profileEditUrl}
        className="inline-flex items-center justify-center px-4 py-1.5 text-sm text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-full font-medium whitespace-nowrap ml-4 transition-all duration-200"
      >
        입력하기
      </Link>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function CompetitivenessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompetitivenessAnalysisData | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        return;
      }

      const res = await fetch(`/api/competitiveness/analysis?organizationId=${orgId}`);

      if (!res.ok) {
        throw new Error('Failed to fetch analysis');
      }

      const result = await res.json();
      setData(result.data);
    } catch (err) {
      console.error('Error fetching competitiveness analysis:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [session]);

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

    fetchAnalysis();
  }, [session, status, router, fetchAnalysis]);

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>

          {/* Score section skeleton */}
          <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded-full w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>

          {/* Cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="font-semibold text-red-900 mb-2">오류 발생</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchAnalysis}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
            >
              다시 시도
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No matches state
  if (!data || data.totalMatches === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-12">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 선정 경쟁력 분석</h1>
          </div>

          {/* Empty state */}
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-4">📭</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              먼저 매칭을 생성해주세요
            </h3>
            <p className="text-gray-600 mb-6">
              매칭된 연구과제가 있어야 경쟁력 분석이 가능합니다.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              매칭 생성하러 가기
              <svg
                className="ml-2 h-4 w-4"
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
      </DashboardLayout>
    );
  }

  // Main content
  const improvableCount = data.conditionallyEligibleCount;

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 선정 경쟁력 분석</h1>
          <p className="text-gray-600 mt-1">
            매칭된 연구과제에서 선정 가능성을 높이기 위한 개선점입니다.
          </p>
        </div>

        {/* Overall Score Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">전체 경쟁력 점수</h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <ScoreProgress score={data.overallScore} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{data.overallScore}/100</div>
          </div>
          <p className="text-sm text-gray-600">
            매칭된 {data.totalMatches}개 연구과제 중{' '}
            <span className="font-medium text-blue-600">{improvableCount}개</span>에서 개선
            가능
          </p>
        </div>

        {/* Improvement Suggestions Section */}
        {data.improvements.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              💡 개선 제안 ({data.improvements.length}건)
            </h2>
            <div className="space-y-4">
              {data.improvements.map((suggestion) => (
                <ImprovementCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          </div>
        )}

        {/* No Improvements State */}
        {data.improvements.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✅</div>
              <div>
                <h3 className="font-semibold text-green-900">
                  현재 프로필로 최대 경쟁력 확보
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  매칭된 연구과제에 대해 추가 개선점이 없습니다. 프로필이 잘 구성되어
                  있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Gaps Section */}
        {data.profileGaps.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">📋 프로필 보완 항목</h2>
            <p className="text-sm text-gray-600 mb-4">
              아래 프로필 항목을 입력하면 더 정확한 분석이 가능합니다.
            </p>
            <div className="divide-y divide-gray-100">
              {data.profileGaps.map((gap) => (
                <ProfileGapCard key={gap.field} gap={gap} />
              ))}
            </div>
          </div>
        )}

        {/* Action CTA */}
        <div className="flex gap-4">
          <Link
            href="/dashboard/matches"
            className="flex-1 text-center py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            매칭 결과 보기
          </Link>
          <Link
            href="/dashboard/profile/edit"
            className="flex-1 text-center py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            프로필 수정하기
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
