'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Organization {
  id: string;
  type: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  industrySector: string | null;
  employeeCount: string | null;
  revenueRange: string | null;
  rdExperience: boolean;
  technologyReadinessLevel: number | null;
  instituteType: string | null;
  researchFocusAreas: string[] | null;
  annualRdBudget: string | null;
  researcherCount: number | null;
  keyTechnologies: string[] | null;
  collaborationHistory: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  profileScore: number;
  createdAt: string;
  _count: {
    funding_matches: number;
  };
}

interface CompatibilityScore {
  score: number;
  breakdown: {
    trlFitScore: number;
    industryScore: number;
    scaleScore: number;
    experienceScore: number;
  };
  reasons: string[];
  explanation: string;
}

export default function PartnerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [compatibilityScore, setCompatibilityScore] = useState<CompatibilityScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    async function fetchPartner() {
      try {
        const response = await fetch(`/api/partners/${params.id}`);
        const data = await response.json();

        if (data.success) {
          setOrganization(data.organization);
          setCompatibilityScore(data.compatibilityScore);
        } else {
          setError(data.error || '파트너 정보를 불러올 수 없습니다');
        }
      } catch (err) {
        setError('파트너 정보를 불러오는 중 오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPartner();
  }, [params.id]);

  // Get color class based on compatibility score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Get progress bar color
  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !organization) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <p className="text-red-600">{error || '파트너를 찾을 수 없습니다'}</p>
          <button
            onClick={() => router.push('/dashboard/partners')}
            className="mt-4 text-blue-600 hover:underline"
          >
            파트너 검색으로 돌아가기
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header with back button */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/partners')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          파트너 검색으로 돌아가기
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Organization Profile */}
        <div className="lg:col-span-2">
          {/* Organization Header Card */}
          <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex items-start gap-6">
              {organization.logoUrl ? (
                <img
                  src={organization.logoUrl}
                  alt={organization.name}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-purple-100">
                  <span className="text-3xl font-bold text-blue-600">
                    {organization.name.charAt(0)}
                  </span>
                </div>
              )}

              <div className="flex-1">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">{organization.name}</h1>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    {organization.type === 'COMPANY' ? '기업' : '연구기관'}
                  </span>
                  {organization.industrySector && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                      {organization.industrySector}
                    </span>
                  )}
                  {organization.technologyReadinessLevel && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700">
                      TRL {organization.technologyReadinessLevel}
                    </span>
                  )}
                </div>
                {organization.website && (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    🔗 {organization.website}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* About Section */}
          {organization.description && (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">소개</h2>
              <p className="whitespace-pre-wrap text-gray-700">{organization.description}</p>
            </div>
          )}

          {/* Key Technologies / Research Focus */}
          {(organization.keyTechnologies?.length || organization.researchFocusAreas?.length) ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                {organization.type === 'COMPANY' ? '핵심 기술' : '연구 분야'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {(organization.keyTechnologies || organization.researchFocusAreas || []).map((tech, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-2 text-sm font-medium text-purple-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Organization Details */}
          <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-900">조직 정보</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {organization.employeeCount && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">직원 수</dt>
                  <dd className="mt-1 text-base text-gray-900">
                    {organization.employeeCount.replace('_', ' ').replace('FROM', '').replace('TO', '-').replace('UNDER', '~').replace('OVER', '+').toLowerCase()}
                  </dd>
                </div>
              )}
              {organization.revenueRange && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">매출 규모</dt>
                  <dd className="mt-1 text-base text-gray-900">
                    {organization.revenueRange.replace('_', ' ').replace('FROM', '').replace('TO', '-').replace('B', '억').toLowerCase()}
                  </dd>
                </div>
              )}
              {organization.researcherCount && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">연구원 수</dt>
                  <dd className="mt-1 text-base text-gray-900">{organization.researcherCount}명</dd>
                </div>
              )}
              {organization.annualRdBudget && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">연간 R&D 예산</dt>
                  <dd className="mt-1 text-base text-gray-900">{organization.annualRdBudget}</dd>
                </div>
              )}
              {organization.instituteType && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">기관 유형</dt>
                  <dd className="mt-1 text-base text-gray-900">{organization.instituteType}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">R&D 경험</dt>
                <dd className="mt-1 text-base text-gray-900">
                  {organization.rdExperience ? '있음' : '없음'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Collaboration History */}
          {organization.collaborationHistory && (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">협력 이력</h2>
              <p className="whitespace-pre-wrap text-gray-700">{organization.collaborationHistory}</p>
            </div>
          )}

          {/* Contact Information */}
          {(organization.primaryContactName || organization.primaryContactEmail) && (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-900">담당자 정보</h2>
              <dl className="space-y-2">
                {organization.primaryContactName && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">담당자</dt>
                    <dd className="mt-1 text-base text-gray-900">{organization.primaryContactName}</dd>
                  </div>
                )}
                {organization.primaryContactEmail && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">이메일</dt>
                    <dd className="mt-1 text-base text-gray-900">
                      <a href={`mailto:${organization.primaryContactEmail}`} className="text-blue-600 hover:underline">
                        {organization.primaryContactEmail}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Right Column: Compatibility Score & Actions */}
        <div className="lg:col-span-1">
          {/* Compatibility Score Card */}
          {compatibilityScore && (
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">호환성 점수</h2>

              {/* Overall Score */}
              <div className={`mb-6 rounded-xl border-2 p-4 text-center ${getScoreColor(compatibilityScore.score)}`}>
                <div className="text-4xl font-bold">{compatibilityScore.score}</div>
                <div className="text-sm font-medium">/ 100</div>
              </div>

              {/* Explanation */}
              <p className="mb-6 text-sm text-gray-600">{compatibilityScore.explanation}</p>

              {/* Score Breakdown */}
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">TRL 적합도</span>
                    <span className="text-sm font-bold text-gray-900">{compatibilityScore.breakdown.trlFitScore}/40</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${getProgressColor(compatibilityScore.breakdown.trlFitScore * 2.5)}`}
                      style={{ width: `${(compatibilityScore.breakdown.trlFitScore / 40) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">산업/기술 일치</span>
                    <span className="text-sm font-bold text-gray-900">{compatibilityScore.breakdown.industryScore}/30</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${getProgressColor((compatibilityScore.breakdown.industryScore / 30) * 100)}`}
                      style={{ width: `${(compatibilityScore.breakdown.industryScore / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">조직 규모 적합성</span>
                    <span className="text-sm font-bold text-gray-900">{compatibilityScore.breakdown.scaleScore}/15</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${getProgressColor((compatibilityScore.breakdown.scaleScore / 15) * 100)}`}
                      style={{ width: `${(compatibilityScore.breakdown.scaleScore / 15) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">R&D 경험</span>
                    <span className="text-sm font-bold text-gray-900">{compatibilityScore.breakdown.experienceScore}/15</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${getProgressColor((compatibilityScore.breakdown.experienceScore / 15) * 100)}`}
                      style={{ width: `${(compatibilityScore.breakdown.experienceScore / 15) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-medium text-white transition-all hover:from-blue-700 hover:to-blue-800"
            >
              연결 요청
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full rounded-lg border-2 border-purple-600 bg-white px-6 py-3 font-medium text-purple-600 transition-all hover:bg-purple-50"
            >
              컨소시엄 초대
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-blue-700">
              <strong>연결 요청:</strong> 일반 협력 문의를 보냅니다
            </p>
            <p className="mt-2 text-xs text-blue-700">
              <strong>컨소시엄 초대:</strong> 특정 과제에 참여를 초대합니다
            </p>
          </div>
        </div>
      </div>

      {/* Connect Modal (Placeholder) */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">연결 요청</h2>
            <p className="mb-6 text-gray-600">
              {organization.name}에게 협력 문의를 보냅니다. 이 기능은 Phase 7에서 구현됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConnectModal(false)}
                className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  alert('연결 요청 기능은 Phase 7에서 구현됩니다');
                  setShowConnectModal(false);
                }}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                요청 보내기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal (Placeholder) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">컨소시엄 초대</h2>
            <p className="mb-6 text-gray-600">
              {organization.name}을(를) 컨소시엄에 초대합니다. 이 기능은 Phase 7에서 구현됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  alert('컨소시엄 초대 기능은 Phase 7에서 구현됩니다');
                  setShowInviteModal(false);
                }}
                className="flex-1 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-700"
              >
                초대 보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
