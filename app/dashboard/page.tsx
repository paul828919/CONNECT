'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [usage, setUsage] = useState<{ used: number; remaining: number; plan: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Check if user has organization profile
    const hasOrganization = (session.user as any)?.organizationId;

    if (!hasOrganization) {
      // Redirect to organization profile creation
      router.push('/dashboard/profile/create');
      return;
    }

    fetchMatchStats();
  }, [session, status, router]);

  const fetchMatchStats = async () => {
    try {
      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) return;

      const res = await fetch(`/api/matches?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setMatchCount(data.matches?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching match stats:', err);
    }
  };

  const handleGenerateMatches = async () => {
    try {
      setGenerating(true);
      setError(null);

      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        return;
      }

      const res = await fetch(`/api/matches/generate?organizationId=${orgId}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.status === 429) {
        setError(data.message || '이번 달 무료 매칭 횟수를 모두 사용하셨습니다.');
        return;
      }

      if (!res.ok) {
        setError(data.message || '매칭 생성에 실패했습니다.');
        return;
      }

      setUsage({
        used: data.usage.matchesUsed,
        remaining: data.usage.matchesRemaining,
        plan: data.usage.plan,
      });

      // Redirect to matches page
      router.push('/dashboard/matches');
    } catch (err) {
      console.error('Error generating matches:', err);
      setError('매칭 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const hasOrganization = (session.user as any)?.organizationId;

  if (!hasOrganization) {
    return null; // Will redirect
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
          {/* Welcome Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              환영합니다! 👋
            </h2>
            <p className="mt-2 text-gray-600">
              Connect 플랫폼에 오신 것을 환영합니다. 프로필이 설정되면 맞춤형 R&D 펀딩 기회를 확인하실 수 있습니다.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-6 sm:grid-cols-3">
            <Link href="/dashboard/matches" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm font-medium text-gray-600">
                내 매칭
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{matchCount}</div>
              <div className="mt-1 text-xs text-gray-500">저장된 매칭</div>
            </Link>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">
                활성 프로그램
              </div>
              <div className="mt-2 text-3xl font-bold text-purple-600">8</div>
              <div className="mt-1 text-xs text-gray-500">4개 기관</div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-gray-600">
                구독 플랜
              </div>
              <div className="mt-2 text-3xl font-bold text-green-600">Free</div>
              <div className="mt-1 text-xs text-gray-500">
                {usage ? `${usage.remaining}회 남음` : '3 매칭/월'}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Match Generation Section */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                맞춤형 펀딩 기회 찾기
              </h3>
              <p className="text-gray-600">
                귀하의 조직 프로필에 최적화된 정부 R&D 지원 프로그램을 추천해드립니다.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleGenerateMatches}
                disabled={generating}
                className={`
                  inline-flex items-center px-8 py-4 rounded-lg font-semibold text-white
                  transition-all transform
                  ${generating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                  }
                `}
              >
                {generating ? (
                  <>
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    매칭 생성 중...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    매칭 생성하기
                  </>
                )}
              </button>

              <p className="text-sm text-gray-500">
                4개 주요 기관 (IITP, KEIT, TIPA, KIMST)의 활성 프로그램 대상
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard/profile/edit"
              className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h4 className="font-semibold text-gray-900 mb-1">조직 프로필 관리</h4>
              <p className="text-sm text-gray-600">프로필을 업데이트하여 더 정확한 매칭 받기</p>
            </Link>
            <Link
              href="/dashboard/matches"
              className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h4 className="font-semibold text-gray-900 mb-1">매칭 결과 보기</h4>
              <p className="text-sm text-gray-600">저장된 매칭 결과 확인 및 관리</p>
            </Link>
          </div>
        </div>
    </DashboardLayout>
  );
}