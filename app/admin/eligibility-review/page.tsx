'use client';

/**
 * Admin Data Quality Dashboard (Refactored from Eligibility Review)
 *
 * Purpose: Monitor eligibility extraction quality (read-only, no manual review)
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 *
 * Features:
 * 1. Display confidence level distribution (HIGH, MEDIUM, LOW)
 * 2. Filter by confidence level and agency
 * 3. View extracted eligibility criteria (read-only)
 * 4. Link to original announcements
 *
 * Note: Manual review workflow removed. Users now self-verify eligibility
 * through the confidence-based alerts on the matches page.
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface EligibilityProgram {
  id: string;
  title: string;
  agencyId: string;
  announcementUrl: string;
  eligibilityCriteria: any;
  eligibilityConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  requiredCertifications: string[] | null;
  preferredCertifications: string[] | null;
  requiredInvestmentAmount: number | null;
  requiredOperatingYears: number | null;
  maxOperatingYears: number | null;
  createdAt: string;
  scrapedAt: string;
}

export default function AdminDataQualityDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [programs, setPrograms] = useState<EligibilityProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch programs function
  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (confidenceFilter !== 'ALL') params.append('confidence', confidenceFilter);
      if (agencyFilter !== 'ALL') params.append('agency', agencyFilter);
      params.append('status', 'ALL'); // Always fetch all programs for monitoring

      const response = await fetch(`/api/admin/eligibility-review?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch programs');
      }

      setPrograms(data.programs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [confidenceFilter, agencyFilter]);

  // Fetch programs on mount and filter change
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchPrograms();
  }, [status, fetchPrograms]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchPrograms()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate confidence distribution
  const highCount = programs.filter((p) => p.eligibilityConfidence === 'HIGH').length;
  const mediumCount = programs.filter((p) => p.eligibilityConfidence === 'MEDIUM').length;
  const lowCount = programs.filter((p) => p.eligibilityConfidence === 'LOW').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">자격 요건 데이터 품질</h1>
          <p className="text-muted-foreground">자격 요건 추출 품질 모니터링 (읽기 전용)</p>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
              <p className="text-sm font-medium text-blue-900 mb-1">
                자동화된 사용자 안내 시스템
              </p>
              <p className="text-sm text-blue-800">
                사용자는 매칭 결과 페이지에서 신뢰도에 따른 안내 메시지를 자동으로 확인할 수 있습니다.
                LOW 신뢰도 프로그램은 담당 과제관리자에게 직접 확인하도록 안내됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 bg-white rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Confidence Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                신뢰도 수준
              </label>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">모든 신뢰도</option>
                <option value="LOW">낮음</option>
                <option value="MEDIUM">보통</option>
                <option value="HIGH">높음</option>
              </select>
            </div>

            {/* Agency Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                출처 기관
              </label>
              <select
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">모든 기관</option>
                <option value="NTIS">NTIS (국가과학기술지식정보서비스)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats - Confidence Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">총 프로그램</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{programs.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="text-sm text-green-700">높은 신뢰도</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{highCount}</div>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="text-sm text-yellow-700">중간 신뢰도</div>
            <div className="text-3xl font-bold text-yellow-600 mt-1">{mediumCount}</div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="text-sm text-red-700">낮은 신뢰도</div>
            <div className="text-3xl font-bold text-red-600 mt-1">{lowCount}</div>
          </div>
        </div>

        {/* Program List (Read-Only) */}
        <div className="space-y-4">
          {programs.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">표시할 프로그램이 없습니다</p>
            </div>
          ) : (
            programs.map((program) => (
              <div
                key={program.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{program.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          program.eligibilityConfidence === 'HIGH'
                            ? 'bg-green-100 text-green-800'
                            : program.eligibilityConfidence === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {program.eligibilityConfidence === 'HIGH'
                          ? '높음'
                          : program.eligibilityConfidence === 'MEDIUM'
                          ? '보통'
                          : '낮음'}
                      </span>
                      <span className="text-sm text-gray-500">{program.agencyId}</span>
                    </div>

                    <div className="text-sm text-gray-700 space-y-2">
                      {program.requiredCertifications && program.requiredCertifications.length > 0 && (
                        <div>
                          <strong>필수 인증:</strong> {program.requiredCertifications.join(', ')}
                        </div>
                      )}
                      {program.preferredCertifications && program.preferredCertifications.length > 0 && (
                        <div>
                          <strong>우대 인증:</strong> {program.preferredCertifications.join(', ')}
                        </div>
                      )}
                      {program.requiredInvestmentAmount && (
                        <div>
                          <strong>최소 투자액:</strong> ₩{program.requiredInvestmentAmount.toLocaleString()}
                        </div>
                      )}
                      {program.requiredOperatingYears && (
                        <div>
                          <strong>운영 연수:</strong> {program.requiredOperatingYears}
                          {program.maxOperatingYears ? ` - ${program.maxOperatingYears}` : '+'} 년
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Link to Original Announcement (Read-Only) */}
                  <a
                    href={program.announcementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors inline-flex items-center"
                  >
                    원본 공고
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
