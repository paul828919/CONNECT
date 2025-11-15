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
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  // Trust & Credentials (Priority 1)
  certifications: string[] | null;
  governmentCertifications: string[] | null;
  industryAwards: string[] | null;
  patentCount: number | null;
  // Track Record (Priority 2)
  businessEstablishedDate: string | null;
  collaborationCount: number | null;
  priorGrantWins: number | null;
  priorGrantTotalAmount: string | null; // BigInt serialized as string
  // Consortium Preferences (Priority 4)
  desiredConsortiumFields: string[] | null;
  desiredTechnologies: string[] | null;
  targetPartnerTRL: number | null;
  commercializationCapabilities: string[] | null;
  expectedTRLLevel: number | null;
  targetOrgScale: string | null;
  targetOrgRevenue: string | null;
  // Investment History (Priority 3)
  investmentHistory: { manualEntry: string; verified: boolean } | null;
  // Additional Fields (Priority 5)
  address: string | null;
  rdInvestmentRatio: number | null;
  lastFinancialYear: number | null;
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

  // Form states for Connect modal
  const [connectSubject, setConnectSubject] = useState('');
  const [connectMessage, setConnectMessage] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState(false);

  // Form states for Invite modal
  const [consortiumName, setConsortiumName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  // Handler for Connect (lightweight collaboration request)
  const handleConnect = async () => {
    if (!connectSubject.trim()) {
      setConnectError('제목을 입력해주세요');
      return;
    }
    if (!connectMessage.trim()) {
      setConnectError('메시지를 입력해주세요');
      return;
    }

    setConnectLoading(true);
    setConnectError(null);

    try {
      const response = await fetch('/api/contact-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverOrgId: organization?.id,
          type: 'COLLABORATION',
          subject: connectSubject,
          message: connectMessage,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConnectSuccess(true);
        setTimeout(() => {
          setShowConnectModal(false);
          setConnectSubject('');
          setConnectMessage('');
          setConnectSuccess(false);
        }, 2000);
      } else {
        setConnectError(data.error || '요청 전송에 실패했습니다');
      }
    } catch (error) {
      setConnectError('요청 전송 중 오류가 발생했습니다');
    } finally {
      setConnectLoading(false);
    }
  };

  // Handler for Consortium Invite (formal consortium creation)
  const handleInvite = async () => {
    if (!consortiumName.trim()) {
      setInviteError('컨소시엄 이름을 입력해주세요');
      return;
    }

    setInviteLoading(true);
    setInviteError(null);

    try {
      const response = await fetch('/api/consortiums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: consortiumName,
          description: `${organization?.name}과(와)의 협력 컨소시엄`,
          invitedMemberOrgIds: [organization?.id],
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to consortium detail/builder page
        router.push(`/dashboard/consortiums/${data.consortium.id}`);
      } else {
        setInviteError(data.error || '컨소시엄 생성에 실패했습니다');
      }
    } catch (error) {
      setInviteError('컨소시엄 생성 중 오류가 발생했습니다');
    } finally {
      setInviteLoading(false);
    }
  };

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

          {/* Trust & Credentials Section (Priority 1) */}
          {(organization.certifications?.length ||
            organization.governmentCertifications?.length ||
            organization.industryAwards?.length ||
            organization.patentCount) ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                <span className="mr-2">🏆</span>
                신뢰도 & 자격증명
              </h2>

              <div className="space-y-6">
                {/* Certifications */}
                {organization.certifications && organization.certifications.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">인증서</h3>
                    <div className="flex flex-wrap gap-2">
                      {organization.certifications.map((cert, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 ring-1 ring-green-600/20"
                        >
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Government Certifications */}
                {organization.governmentCertifications && organization.governmentCertifications.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">정부 인증</h3>
                    <div className="flex flex-wrap gap-2">
                      {organization.governmentCertifications.map((cert, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-600/20"
                        >
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 5.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Industry Awards */}
                {organization.industryAwards && organization.industryAwards.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">수상 내역</h3>
                    <div className="flex flex-wrap gap-2">
                      {organization.industryAwards.map((award, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 ring-1 ring-yellow-600/20"
                        >
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                          {award}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patent Count */}
                {organization.patentCount && organization.patentCount > 0 && (
                  <div className="rounded-lg bg-purple-50 p-4 ring-1 ring-purple-600/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">등록 특허</p>
                        <p className="text-2xl font-bold text-purple-600">{organization.patentCount}건</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Track Record Section (Priority 2) */}
          {(organization.businessEstablishedDate ||
            organization.collaborationCount ||
            organization.priorGrantWins ||
            organization.priorGrantTotalAmount) ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                <span className="mr-2">📊</span>
                업적 & 실적
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Years in Operation */}
                {organization.businessEstablishedDate && (
                  <div className="rounded-lg bg-blue-50 p-4 ring-1 ring-blue-600/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">운영 기간</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {(() => {
                            const establishedDate = new Date(organization.businessEstablishedDate);
                            const currentDate = new Date();
                            const years = currentDate.getFullYear() - establishedDate.getFullYear();
                            return `${years}년`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collaboration Count */}
                {organization.collaborationCount && organization.collaborationCount > 0 && (
                  <div className="rounded-lg bg-green-50 p-4 ring-1 ring-green-600/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">협업 프로젝트</p>
                        <p className="text-2xl font-bold text-green-600">{organization.collaborationCount}건</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prior Grant Wins */}
                {organization.priorGrantWins && organization.priorGrantWins > 0 && (
                  <div className="rounded-lg bg-purple-50 p-4 ring-1 ring-purple-600/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">정부과제 수주</p>
                        <p className="text-2xl font-bold text-purple-600">{organization.priorGrantWins}건</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Prior Grant Total Amount */}
                {organization.priorGrantTotalAmount && (
                  <div className="rounded-lg bg-orange-50 p-4 ring-1 ring-orange-600/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                        <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">총 수주액</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {(() => {
                            const amount = BigInt(organization.priorGrantTotalAmount);
                            const hundredMillion = BigInt(100000000);
                            const inHundredMillion = Number(amount / hundredMillion);
                            return `${inHundredMillion}억원`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Consortium Preferences Section (Priority 4) */}
          {(organization.desiredConsortiumFields?.length ||
            organization.desiredTechnologies?.length ||
            organization.targetPartnerTRL ||
            organization.commercializationCapabilities?.length ||
            organization.expectedTRLLevel ||
            organization.targetOrgScale ||
            organization.targetOrgRevenue) ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                <span className="mr-2">🤝</span>
                컨소시엄 선호도
              </h2>

              <div className="space-y-6">
                {/* Desired Consortium Fields */}
                {organization.desiredConsortiumFields && organization.desiredConsortiumFields.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">희망 연구 분야</h3>
                    <div className="flex flex-wrap gap-2">
                      {organization.desiredConsortiumFields.map((field, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 ring-1 ring-blue-600/20"
                        >
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Desired Technologies */}
                {organization.desiredTechnologies && organization.desiredTechnologies.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">희망 기술 분야</h3>
                    <div className="flex flex-wrap gap-2">
                      {organization.desiredTechnologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 ring-1 ring-indigo-600/20"
                        >
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commercialization Capabilities */}
                {organization.commercializationCapabilities && organization.commercializationCapabilities.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-700">사업화 역량</h3>
                    <div className="flex flex-wrap gap-2">
                      {organization.commercializationCapabilities.map((capability, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-600/20"
                        >
                          <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* TRL Levels and Target Criteria */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Target Partner TRL */}
                  {organization.targetPartnerTRL && (
                    <div className="rounded-lg bg-violet-50 p-4 ring-1 ring-violet-600/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
                          <svg className="h-6 w-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">희망 파트너 TRL</p>
                          <p className="text-2xl font-bold text-violet-600">TRL {organization.targetPartnerTRL}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expected TRL Level */}
                  {organization.expectedTRLLevel && (
                    <div className="rounded-lg bg-rose-50 p-4 ring-1 ring-rose-600/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                          <svg className="h-6 w-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">목표 TRL</p>
                          <p className="text-2xl font-bold text-rose-600">TRL {organization.expectedTRLLevel}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Organization Scale */}
                  {organization.targetOrgScale && (
                    <div className="rounded-lg bg-amber-50 p-4 ring-1 ring-amber-600/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                          <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">희망 파트너 규모</p>
                          <p className="text-base font-bold text-amber-600">
                            {organization.targetOrgScale.replace('_', ' ').replace('FROM', '').replace('TO', '-').replace('UNDER', '~').replace('OVER', '+').toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Target Organization Revenue */}
                  {organization.targetOrgRevenue && (
                    <div className="rounded-lg bg-teal-50 p-4 ring-1 ring-teal-600/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
                          <svg className="h-6 w-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">희망 파트너 매출</p>
                          <p className="text-base font-bold text-teal-600">
                            {organization.targetOrgRevenue.replace('_', ' ').replace('FROM', '').replace('TO', '-').replace('UNDER', '~').replace('BILLION', '억').replace('OVER', '+').toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Investment History Section (Priority 3) */}
          {organization.investmentHistory ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                <span className="mr-2">💰</span>
                투자 이력
                {organization.investmentHistory.verified && (
                  <span className="ml-3 inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                    <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    검증됨
                  </span>
                )}
              </h2>

              <div className="rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 p-6 ring-1 ring-purple-600/10">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">투자 내역</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
                      {organization.investmentHistory.manualEntry}
                    </p>
                  </div>
                </div>
              </div>

              {!organization.investmentHistory.verified && (
                <p className="mt-4 flex items-center text-xs text-gray-500">
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  이 정보는 자체 입력된 내용이며, 아직 검증되지 않았습니다.
                </p>
              )}
            </div>
          ) : null}

          {/* Address Section (Priority 5) */}
          {organization.address ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                <span className="mr-2">📍</span>
                기업 위치
              </h2>
              <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-6 ring-1 ring-gray-900/5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">주소</h3>
                  <p className="text-sm leading-relaxed text-gray-900">{organization.address}</p>
                </div>
              </div>
            </div>
          ) : null}

          {/* R&D Investment Metrics Section (Priority 5) */}
          {(organization.rdInvestmentRatio !== null || organization.lastFinancialYear !== null) ? (
            <div className="mb-6 rounded-2xl bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center text-xl font-bold text-gray-900">
                <span className="mr-2">📊</span>
                R&D 투자 현황
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {organization.rdInvestmentRatio !== null && (
                  <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 p-6 ring-1 ring-green-600/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-600">R&D 투자 비율</dt>
                        <dd className="mt-1 text-2xl font-bold text-gray-900">{organization.rdInvestmentRatio}%</dd>
                      </div>
                    </div>
                  </div>
                )}
                {organization.lastFinancialYear !== null && (
                  <div className="rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 p-6 ring-1 ring-blue-600/10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-600">최근 재무연도</dt>
                        <dd className="mt-1 text-2xl font-bold text-gray-900">{organization.lastFinancialYear}년</dd>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-4 flex items-center text-xs text-gray-500">
                <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                R&D 투자 비율은 매출 대비 연구개발비 비중을 나타냅니다.
              </p>
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

      {/* Connect Modal - Lightweight Collaboration Request */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">연결 요청</h2>
            <p className="mb-6 text-sm text-gray-600">
              {organization.name}에게 협력 문의를 보냅니다
            </p>

            {connectSuccess ? (
              <div className="mb-6 rounded-lg bg-green-50 p-4 text-center">
                <p className="font-medium text-green-800">✓ 요청이 성공적으로 전송되었습니다</p>
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                {/* Subject Input */}
                <div>
                  <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">
                    제목
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={connectSubject}
                    onChange={(e) => setConnectSubject(e.target.value)}
                    placeholder="협력 제안 제목을 입력하세요"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={connectLoading}
                  />
                </div>

                {/* Message Textarea */}
                <div>
                  <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
                    메시지
                  </label>
                  <textarea
                    id="message"
                    value={connectMessage}
                    onChange={(e) => setConnectMessage(e.target.value)}
                    placeholder={`안녕하세요,\n\n${organization.name}의 전문성에 관심이 있어 연락드립니다.\n협력 가능성을 논의하고 싶습니다.\n\n감사합니다.`}
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={connectLoading}
                  />
                </div>

                {/* Error Message */}
                {connectError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {connectError}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setConnectSubject('');
                  setConnectMessage('');
                  setConnectError(null);
                  setConnectSuccess(false);
                }}
                className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
                disabled={connectLoading}
              >
                취소
              </button>
              {!connectSuccess && (
                <button
                  onClick={handleConnect}
                  disabled={connectLoading}
                  className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connectLoading ? '전송 중...' : '요청 보내기'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal - Formal Consortium Creation */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">컨소시엄 초대</h2>
            <p className="mb-6 text-sm text-gray-600">
              {organization.name}을(를) 새로운 컨소시엄 프로젝트에 초대합니다
            </p>

            <div className="mb-6 space-y-4">
              {/* Consortium Name Input */}
              <div>
                <label htmlFor="consortiumName" className="mb-1 block text-sm font-medium text-gray-700">
                  컨소시엄 프로젝트 이름 *
                </label>
                <input
                  id="consortiumName"
                  type="text"
                  value={consortiumName}
                  onChange={(e) => setConsortiumName(e.target.value)}
                  placeholder="예: AI 기반 스마트팜 협력 컨소시엄"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={inviteLoading}
                />
              </div>

              {/* Info Box */}
              <div className="rounded-lg bg-purple-50 p-4">
                <p className="text-xs text-purple-700">
                  <strong>참고:</strong> 컨소시엄이 생성되면 자동으로 상세 페이지로 이동합니다.
                  해당 페이지에서 과제 선택, 예산 등 추가 정보를 입력할 수 있습니다.
                </p>
              </div>

              {/* Invited Partner Display */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-xs font-medium text-gray-600">초대 대상</p>
                <div className="flex items-center gap-3">
                  {organization.logoUrl && (
                    <img
                      src={organization.logoUrl}
                      alt={organization.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{organization.name}</p>
                    <p className="text-xs text-gray-500">{organization.type}</p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {inviteError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {inviteError}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setConsortiumName('');
                  setInviteError(null);
                }}
                className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
                disabled={inviteLoading}
              >
                취소
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex-1 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {inviteLoading ? '생성 중...' : '컨소시엄 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
