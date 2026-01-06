'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CompetitivenessCard from '@/components/dashboard/CompetitivenessCard';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [usage, setUsage] = useState<{ used: number; remaining: number; plan: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    billingCycle: string;
    expiresAt: string;
  } | null>(null);
  const [programStats, setProgramStats] = useState<{
    totalPrograms: number;
    totalGoverningOrgs: number;
  } | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<{
    percentage: number;
    completedCount: number;
    totalCount: number;
  } | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  const fetchMatchStats = useCallback(async () => {
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
  }, [session]);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions/me');
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  }, []);

  const fetchProgramStats = useCallback(async () => {
    try {
      const res = await fetch('/api/funding-programs/stats');
      if (res.ok) {
        const data = await res.json();
        setProgramStats({
          totalPrograms: data.stats.totalPrograms,
          totalGoverningOrgs: data.stats.totalGoverningOrgs,
        });
      }
    } catch (err) {
      console.error('Error fetching program stats:', err);
    }
  }, []);

  const fetchProfileCompletion = useCallback(async () => {
    try {
      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) return;

      const res = await fetch(`/api/organizations/profile-completion?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setProfileCompletion(data.data);
      }
    } catch (err) {
      console.error('Error fetching profile completion:', err);
    }
  }, [session]);

  const fetchOrgName = useCallback(async () => {
    try {
      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) return;

      const res = await fetch(`/api/organizations/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setOrgName(data.organization?.name || null);
      }
    } catch (err) {
      console.error('Error fetching organization name:', err);
    }
  }, [session]);

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
    fetchSubscription();
    fetchProgramStats();
    fetchProfileCompletion();
    fetchOrgName();
  }, [session, status, router, fetchMatchStats, fetchSubscription, fetchProgramStats, fetchProfileCompletion, fetchOrgName]);

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
        setUpgradeUrl(data.upgradeUrl || '/pricing');
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
      <div className="space-y-12">
          {/* Welcome Section */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              {orgName ? `환영합니다, ${orgName}님! 👋` : '환영합니다! 👋'}
            </h2>
            <p className="mt-2 text-gray-600">
              프로필 설정을 완료하고 맞춤형 연구과제 매칭을 시작하세요.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/matches" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow text-center min-h-[120px] flex flex-col justify-center">
              <div className="text-sm font-medium text-gray-600">
                내 매칭
              </div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{matchCount}</div>
              <div className="mt-1 text-xs text-gray-500">저장된 매칭</div>
            </Link>
            <div className="rounded-xl bg-white p-6 shadow-sm text-center min-h-[120px] flex flex-col justify-center">
              <div className="text-sm font-medium text-gray-600">
                접수 중 연구과제
              </div>
              <div className="mt-2 text-3xl font-bold text-purple-600">
                {programStats ? programStats.totalPrograms : '-'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {programStats ? `${programStats.totalGoverningOrgs}개 전문기관 공모 중` : '로딩 중...'}
              </div>
            </div>
            <Link href="/pricing" className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow text-center min-h-[120px] flex flex-col justify-center sm:col-span-2 lg:col-span-1">
              <div className="text-sm font-medium text-gray-600">
                구독 플랜
              </div>
              <div className="mt-2 text-3xl font-bold text-green-600">
                {subscription?.plan || 'Free'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {subscription
                  ? `${subscription.billingCycle === 'MONTHLY' ? '월간' : '연간'} 결제`
                  : usage
                  ? `${usage.remaining}회 남음`
                  : '3 매칭/월'}
              </div>
            </Link>
          </div>

          {/* Error Message / Upgrade Banner */}
          {error && (
            <div className={`rounded-xl border p-6 ${upgradeUrl ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {upgradeUrl ? (
                      <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <h3 className={`font-semibold ${upgradeUrl ? 'text-orange-900' : 'text-red-900'}`}>
                      {upgradeUrl ? '매칭 횟수 제한' : '오류'}
                    </h3>
                  </div>
                  <p className={`text-sm ${upgradeUrl ? 'text-orange-700' : 'text-red-600'} mb-3`}>
                    {error}
                  </p>
                  {upgradeUrl && (
                    <p className="text-sm text-gray-600 mb-4">
                      Pro 플랜으로 업그레이드하여 <strong>무제한 매칭</strong>, 실시간 업데이트, AI 지원 등을 이용하세요.
                    </p>
                  )}
                </div>
                {upgradeUrl && (
                  <Link
                    href={upgradeUrl}
                    className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Pro 업그레이드
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Match Generation Section */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 p-8 border border-blue-100 shadow-md">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                맞춤형 연구과제 찾기
              </h3>
              <p className="text-gray-600">
                국가 R&D 사업 중 귀하의 조직 프로필에 최적화된 연구과제를 추천해드립니다.
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
                NTIS 기반 국가 R&D 통합 연구과제 대상 (30개+ 부처 · 80개+ 전문기관)
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid gap-8 sm:grid-cols-2">
            <Link
              href="/dashboard/profile/edit"
              className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h4 className="font-semibold text-gray-900 mb-2">조직 프로필 관리</h4>
              {profileCompletion && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">프로필 완성도</span>
                    <span className="text-xs font-medium text-gray-700">{profileCompletion.percentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        profileCompletion.percentage >= 80
                          ? 'bg-green-500'
                          : profileCompletion.percentage >= 50
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${profileCompletion.percentage}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600">
                {profileCompletion && profileCompletion.percentage < 100
                  ? '프로필을 완성하면 더 정확한 매칭을 받을 수 있습니다'
                  : '프로필을 업데이트하여 더 정확한 매칭 받기'}
              </p>
            </Link>
            <CompetitivenessCard organizationId={(session?.user as any)?.organizationId || ''} />
          </div>
        </div>
    </DashboardLayout>
  );
}