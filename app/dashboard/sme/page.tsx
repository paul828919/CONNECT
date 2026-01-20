'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface SMEStats {
  programs: {
    total: number;
    active: number;
    expired: number;
    lastSyncAt: string | null;
  };
  matches: {
    totalMatches: number;
    savedMatches: number;
    viewedMatches: number;
    avgScore: number;
    fullyEligibleCount: number;
  };
  certification: {
    certifications: string[];
    verifiedAt: string | null;
    verifyResult: any;
  } | null;
}

export default function SMEDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState<SMEStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/sme-programs/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Error fetching SME stats:', err);
    }
  }, []);

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

    const hasOrganization = (session.user as any)?.organizationId;
    if (!hasOrganization) {
      router.push('/dashboard/profile/create');
      return;
    }

    fetchStats();
    fetchOrgName();
  }, [session, status, router, fetchStats, fetchOrgName]);

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

      setSuccess(data.data.message);

      // Refresh stats
      await fetchStats();

      // Redirect to results page
      if (data.data.matchesGenerated > 0) {
        router.push('/dashboard/sme-programs');
      }
    } catch (err) {
      console.error('Error generating SME matches:', err);
      setError('매칭 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerifyCertifications = async () => {
    try {
      setVerifying(true);
      setError(null);
      setSuccess(null);

      const orgId = (session?.user as any)?.organizationId;
      if (!orgId) {
        setError('조직 정보를 찾을 수 없습니다.');
        return;
      }

      const res = await fetch(`/api/organizations/${orgId}/verify-certifications`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '인증 확인에 실패했습니다.');
        return;
      }

      setSuccess(data.message);

      // Refresh stats
      await fetchStats();
    } catch (err) {
      console.error('Error verifying certifications:', err);
      setError('인증 확인 중 오류가 발생했습니다.');
    } finally {
      setVerifying(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto"></div>
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
    return null;
  }

  const certifications = stats?.certification?.certifications || [];
  const hasVerifiedCerts = stats?.certification?.verifiedAt;

  return (
    <DashboardLayout>
      <div className="space-y-12">
        {/* Welcome Section */}
        <div className="rounded-xl bg-white p-6 shadow-sm border-l-4 border-purple-500">
          <h2 className="text-xl font-semibold text-gray-900">
            {orgName ? `환영합니다, ${orgName}님! 👋` : '환영합니다! 👋'}
          </h2>
          <p className="mt-2 text-gray-600">
            중소벤처기업부 지원사업 중 귀사에 적합한 프로그램을 찾아보세요.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/sme-programs"
            className="rounded-xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow text-center min-h-[120px] flex flex-col justify-center"
          >
            <div className="text-sm font-medium text-gray-600">내 SME 매칭</div>
            <div className="mt-2 text-3xl font-bold text-purple-600">
              {stats?.matches.totalMatches || 0}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {stats?.matches.savedMatches || 0}개 저장됨
            </div>
          </Link>

          <div className="rounded-xl bg-white p-6 shadow-sm text-center min-h-[120px] flex flex-col justify-center">
            <div className="text-sm font-medium text-gray-600">접수 중 지원사업</div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {stats?.programs.active || '-'}
            </div>
            <div className="mt-1 text-xs text-gray-500">중기부 공모 중</div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm text-center min-h-[120px] flex flex-col justify-center sm:col-span-2 lg:col-span-1">
            <div className="text-sm font-medium text-gray-600">인증 현황</div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {certifications.length > 0 ? (
                certifications.slice(0, 3).map((cert, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    ✅ {cert}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">인증 정보 없음</span>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {hasVerifiedCerts ? '확인됨' : '미확인'}
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {/* Match Generation Section - Purple gradient (distinct from R&D blue) */}
        <div className="rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 p-8 border border-purple-100 shadow-md">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              맞춤형 지원사업 찾기
            </h3>
            <p className="text-gray-600">
              중소벤처기업부 지원사업 중 귀사 프로필에 맞는 금융·기술·인력·창업 지원사업을 추천해드립니다.
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
                  : 'bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95'
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
                  지원사업 매칭 생성하기
                </>
              )}
            </button>

            <p className="text-sm text-gray-500">
              중소벤처24 기반 (정책자금, 기술개발, 창업지원 등)
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
            <p className="text-sm text-gray-600 mb-4">
              프로필을 완성하면 더 정확한 지원사업 매칭을 받을 수 있습니다.
            </p>
            <span className="text-purple-600 text-sm font-medium">
              프로필 수정하기 →
            </span>
          </Link>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2">📋 인증서 확인</h4>
            <p className="text-sm text-gray-600 mb-4">
              이노비즈/벤처/메인비즈 인증을 API로 실시간 확인합니다.
            </p>
            <button
              onClick={handleVerifyCertifications}
              disabled={verifying}
              className={`
                inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium
                transition-all
                ${verifying
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }
              `}
            >
              {verifying ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                  확인 중...
                </>
              ) : (
                '인증 확인하기'
              )}
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-xl bg-gray-50 p-6 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h5 className="font-medium text-gray-900 mb-1">SME 지원사업 매칭이란?</h5>
              <p className="text-sm text-gray-600">
                중소벤처기업부에서 제공하는 금융지원, 기술개발, 창업지원, 인력양성 등 다양한 지원사업을
                귀사의 기업규모, 매출액, 업력, 소재지, 인증현황 등을 분석하여 적합한 사업을 추천해드립니다.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                ※ 이 서비스는 기존 R&D 연구과제 매칭과 별도로 운영됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
