'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface CompatibilityData {
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

interface Organization {
  id: string;
  type: string;
  name: string;
  description: string | null;
  industrySector: string | null;
  employeeCount: string | null;
  technologyReadinessLevel: number | null;
  rdExperience: boolean;
  researchFocusAreas: string[];
  keyTechnologies: string[];
  logoUrl: string | null;
  compatibility: CompatibilityData | null;
}

interface UserOrganization {
  id: string;
  type: string;
  desiredConsortiumFields: string[] | null;
  desiredTechnologies: string[] | null;
  targetPartnerTRL: number | null;
  commercializationCapabilities: string[] | null;
  expectedTRLLevel: number | null;
  targetOrgScale: string | null;
  targetOrgRevenue: string | null;
}

// Helper functions for compatibility UI
const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';  // 🟢
  if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'; // 🟡
  return 'text-gray-600 bg-gray-50 border-gray-200';                      // ⚪
};

const getScoreBadgeColor = (score: number) => {
  if (score >= 80) return 'bg-green-500 text-white';  // 🟢
  if (score >= 60) return 'bg-yellow-500 text-white'; // 🟡
  return 'bg-gray-400 text-white';                    // ⚪
};

// Map reason codes to Korean explanations
// Complete mapping of all 35 possible reason codes from lib/matching/partner-algorithm.ts
const reasonMap: Record<string, string> = {
  // TRL Complementarity (14 codes)
  PERFECT_TRL_COMPLEMENT_EARLY: '초기 단계 TRL 완벽 보완',
  STRONG_TRL_COMPLEMENT_EARLY: '초기 단계 TRL 강력 보완',
  GOOD_TRL_COMPLEMENT_EARLY: '초기 단계 TRL 우수 보완',
  PERFECT_TRL_COMPLEMENT_COMMERCIAL: '상용화 TRL 완벽 보완',
  STRONG_TRL_COMPLEMENT_COMMERCIAL: '상용화 TRL 강력 보완',
  GOOD_TRL_COMPLEMENT_COMMERCIAL: '상용화 TRL 우수 보완',
  PERFECT_TRL_COMPLEMENT_COMMERCIALIZATION: '상업화 TRL 완벽 보완',
  STRONG_TRL_COMPLEMENT_COMMERCIALIZATION: '상업화 TRL 강력 보완',
  PERFECT_TRL_TARGET_MATCH: '목표 TRL 완벽 일치',
  STRONG_TRL_TARGET_MATCH: '목표 TRL 강력 일치',
  TRL_GAP_INNOVATION_OPPORTUNITY: 'TRL 격차로 혁신 기회 제공',
  TRL_GAP_MODERATE: '적절한 TRL 격차',
  TRL_SIMILAR: '유사한 TRL 수준',
  TRL_DATA_MISSING: 'TRL 데이터 보완 필요',

  // Industry/Technology Alignment (6 codes)
  INDUSTRY_SECTOR_MATCH: '산업 분야 일치',
  RESEARCH_FOCUS_MATCH: '연구 분야 일치',
  TECHNOLOGY_MATCH: '기술 역량 일치',
  CAPABILITY_MATCH: '역량 보완 가능',
  SAME_INDUSTRY: '동일 산업 분야',
  CROSS_INDUSTRY_RELEVANT: '관련 산업 분야',

  // Organization Scale (10 codes)
  PERFECT_SCALE_MATCH: '조직 규모 완벽 일치',
  GOOD_SCALE_MATCH: '조직 규모 적합',
  PERFECT_REVENUE_MATCH: '매출 규모 완벽 일치',
  GOOD_REVENUE_MATCH: '매출 규모 적합',
  LARGE_RESEARCH_CAPACITY: '대규모 연구 역량 보유',
  MODERATE_RESEARCH_CAPACITY: '중규모 연구 역량 보유',
  SMALL_RESEARCH_CAPACITY: '소규모 연구 역량 보유',
  SIMILAR_SIZE: '유사한 조직 규모',
  COMPATIBLE_SIZE: '적합한 조직 규모',
  SCALE_DATA_LIMITED: '규모 정보 보완 필요',

  // R&D Experience (5 codes)
  CANDIDATE_HAS_RD_EXPERIENCE: 'R&D 경험 보유',
  EXTENSIVE_COLLABORATION_HISTORY: '풍부한 협력 경험',
  MODERATE_COLLABORATION_HISTORY: '적절한 협력 경험',
  LIMITED_COLLABORATION_HISTORY: '협력 경험 보유',
  EXPERIENCE_DATA_LIMITED: '경험 정보 보완 필요',
};

interface Recommendation {
  organization: Organization;
  compatibility: CompatibilityData;
}

export default function PartnersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('compatibility'); // compatibility, profile, name
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Consortium preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [userOrganization, setUserOrganization] = useState<UserOrganization | null>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);

  // Check for missing consortium preferences and show modal
  useEffect(() => {
    async function checkConsortiumPreferences() {
      if (!session?.user) return;

      // Check localStorage for dismissal (valid for 7 days)
      const dismissalKey = 'consortium_preferences_dismissed';
      const dismissedAt = localStorage.getItem(dismissalKey);
      if (dismissedAt) {
        const dismissedDate = new Date(dismissedAt);
        const now = new Date();
        const daysSinceDismissal = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissal < 7) {
          return; // Still within 7-day dismissal window
        }
      }

      // Fetch user's organization
      try {
        const response = await fetch('/api/user/organization');
        const data = await response.json();

        if (data.success && data.organization) {
          setUserOrganization(data.organization);

          // Check if consortium preferences are missing
          const hasPreferences =
            (data.organization.desiredConsortiumFields && data.organization.desiredConsortiumFields.length > 0) ||
            (data.organization.desiredTechnologies && data.organization.desiredTechnologies.length > 0) ||
            data.organization.targetPartnerTRL ||
            (data.organization.commercializationCapabilities && data.organization.commercializationCapabilities.length > 0) ||
            data.organization.expectedTRLLevel ||
            data.organization.targetOrgScale ||
            data.organization.targetOrgRevenue;

          // Show modal if preferences are missing
          if (!hasPreferences) {
            setShowPreferencesModal(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user organization:', error);
      }
    }

    checkConsortiumPreferences();
  }, [session]);

  // Fetch personalized recommendations
  useEffect(() => {
    async function fetchRecommendations() {
      if (!session?.user) return;

      setIsLoadingRecommendations(true);
      try {
        const response = await fetch('/api/partners/recommendations?limit=5');
        const data = await response.json();

        if (data.success && data.recommendations) {
          // Map API response to component state format
          const mappedRecommendations = data.recommendations.map((rec: any) => ({
            organization: {
              id: rec.organization.id,
              type: rec.organization.type,
              name: rec.organization.name,
              description: rec.organization.businessDescription || null,
              industrySector: rec.organization.industrySector || null,
              employeeCount: rec.organization.employeeCount || null,
              technologyReadinessLevel: rec.organization.currentTRL || null,
              rdExperience: rec.organization.hasRDExperience || false,
              researchFocusAreas: rec.organization.researchFocus || [],
              keyTechnologies: rec.organization.keyTechnologies || [],
              logoUrl: rec.organization.logoUrl || null,
              compatibility: rec.compatibility,
            },
            compatibility: rec.compatibility,
          }));

          setRecommendations(mappedRecommendations);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    }

    fetchRecommendations();
  }, [session]);

  // Fetch partners
  useEffect(() => {
    async function fetchPartners() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '12',
          sortBy,
          ...(searchQuery && { q: searchQuery }),
          ...(typeFilter && { type: typeFilter }),
          ...(industryFilter && { industry: industryFilter }),
        });

        const response = await fetch(`/api/partners/search?${params}`);
        const data = await response.json();

        if (data.success) {
          setOrganizations(data.data.organizations);
          setTotalPages(data.data.pagination.totalPages);
        }
      } catch (error) {
        console.error('Failed to fetch partners:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPartners();
  }, [searchQuery, typeFilter, industryFilter, sortBy, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
  };

  // Handle modal dismissal
  const handleDismissModal = () => {
    const dismissalKey = 'consortium_preferences_dismissed';
    localStorage.setItem(dismissalKey, new Date().toISOString());
    setShowPreferencesModal(false);
  };

  // Handle navigation to profile edit
  const handleCompletePreferences = () => {
    setShowPreferencesModal(false);
    router.push('/dashboard/profile/edit?preferences=true');
  };

  return (
    <DashboardLayout>
      {/* Consortium Preferences Prompt Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-purple-100 to-blue-100 p-4">
                <svg
                  className="h-12 w-12 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-3 text-center text-2xl font-bold text-gray-900">
              더 나은 파트너 매칭을 위해
            </h2>

            {/* Description */}
            <p className="mb-6 text-center text-gray-600">
              {userOrganization?.type === 'COMPANY'
                ? '원하는 협력 분야와 파트너 TRL 수준을 설정하면, 여러분의 목표에 가장 적합한 연구기관을 추천받을 수 있습니다.'
                : '기술이전 가능한 분야와 목표 TRL 수준을 설정하면, 여러분의 역량과 잘 맞는 기업을 추천받을 수 있습니다.'}
            </p>

            {/* Benefits List */}
            <div className="mb-8 space-y-3 rounded-lg bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <p className="text-sm text-gray-700">
                  상호 보완적인 TRL 수준을 가진 파트너 발견
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <p className="text-sm text-gray-700">
                  원하는 기술 분야와 산업 분야가 일치하는 파트너 추천
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">✓</span>
                <p className="text-sm text-gray-700">
                  높은 호환성 점수를 가진 최적의 매칭 결과
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleDismissModal}
                className="flex-1 rounded-lg border-2 border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                나중에 하기
              </button>
              <button
                onClick={handleCompletePreferences}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-medium text-white transition-all hover:from-purple-700 hover:to-blue-700"
              >
                선호도 입력하기
              </button>
            </div>

            {/* Small Print */}
            <p className="mt-4 text-center text-xs text-gray-500">
              7일 동안 다시 표시되지 않습니다
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">파트너 검색</h1>
          <p className="mt-2 text-gray-600">
            협업 가능한 기업 및 연구기관을 검색하세요
          </p>
        </div>

        {/* Recommended Partners Section */}
        {!isLoadingRecommendations && recommendations.length > 0 && (
          <div className="mb-8 rounded-2xl bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-6 shadow-sm">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 shadow-sm">
                  <svg
                    className="h-6 w-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">추천 파트너</h2>
                  <p className="text-sm text-gray-600">
                    여러분의 프로필과 가장 잘 맞는 파트너입니다
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSortBy('compatibility');
                  setPage(1);
                  setSearchQuery('');
                  setTypeFilter('');
                  setIndustryFilter('');
                }}
                className="rounded-lg border border-purple-300 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
              >
                전체 보기
              </button>
            </div>

            {/* Recommendations Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.organization.id}
                  className={`group relative cursor-pointer rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-md border-2 ${
                    rec.compatibility.score >= 80
                      ? 'border-green-200 hover:border-green-300'
                      : rec.compatibility.score >= 60
                      ? 'border-yellow-200 hover:border-yellow-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => router.push(`/dashboard/partners/${rec.organization.id}`)}
                >
                  {/* Compatibility Score Badge */}
                  <div className="absolute right-4 top-4">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${getScoreBadgeColor(
                        rec.compatibility.score
                      )} shadow-sm`}
                    >
                      <span className="text-xs font-bold">{rec.compatibility.score}</span>
                    </div>
                  </div>

                  <div className="mb-3 flex items-start justify-between pr-14">
                    <div>
                      <h3 className="font-semibold text-gray-900">{rec.organization.name}</h3>
                      <p className="text-xs text-gray-600">
                        {rec.organization.type === 'COMPANY' ? '기업' : '연구기관'}
                      </p>
                    </div>
                  </div>

                  {rec.organization.industrySector && (
                    <div className="mb-2">
                      <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                        {rec.organization.industrySector}
                      </span>
                    </div>
                  )}

                  {rec.organization.description && (
                    <p className="mb-3 line-clamp-2 text-xs text-gray-600">
                      {rec.organization.description}
                    </p>
                  )}

                  {/* Match Reasons */}
                  {rec.compatibility.reasons.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-2.5">
                      <div className="mb-1 flex items-center gap-1">
                        <svg
                          className="h-3.5 w-3.5 text-purple-600"
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
                        <span className="text-xs font-semibold text-gray-700">
                          추천 이유
                        </span>
                      </div>
                      <ul className="ml-4 space-y-0.5">
                        {rec.compatibility.reasons.slice(0, 2).map((reason, idx) => (
                          <li key={idx} className="text-xs text-gray-600">
                            • {reasonMap[reason] || reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/partners/${rec.organization.id}`);
                    }}
                    className="mt-3 w-full rounded-lg border border-purple-600 px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50"
                  >
                    프로필 보기
                  </button>
                </div>
              ))}
            </div>

            {/* Info Footer */}
            <div className="mt-4 rounded-lg bg-white/60 p-3 text-center">
              <p className="text-xs text-gray-600">
                💡 이 추천은 여러분의 프로필 정보를 기반으로 24시간마다 업데이트됩니다
              </p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                검색어
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="기관명, 산업 분야, 키워드 검색..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  기관 유형
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  <option value="COMPANY">기업</option>
                  <option value="RESEARCH_INSTITUTE">연구기관</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  산업 분야
                </label>
                <input
                  type="text"
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  placeholder="예: ICT, 바이오, 제조..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  정렬 기준
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1); // Reset to page 1 on sort change
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="compatibility">호환성 높은 순</option>
                  <option value="profile">프로필 점수 순</option>
                  <option value="name">이름 순</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              검색
            </button>
          </form>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-600">검색 결과가 없습니다</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {organizations.length}개 기관 발견
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className={`group relative cursor-pointer rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md ${
                    org.compatibility
                      ? `border-2 ${
                          org.compatibility.score >= 80
                            ? 'border-green-200 hover:border-green-300'
                            : org.compatibility.score >= 60
                            ? 'border-yellow-200 hover:border-yellow-300'
                            : 'border-gray-200 hover:border-gray-300'
                        }`
                      : 'border border-gray-200'
                  }`}
                  onClick={() => router.push(`/dashboard/partners/${org.id}`)}
                >
                  {/* Compatibility Score Badge (Top Right) */}
                  {org.compatibility && (
                    <div className="absolute right-4 top-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full ${getScoreBadgeColor(
                          org.compatibility.score
                        )} shadow-sm`}
                      >
                        <span className="text-sm font-bold">{org.compatibility.score}</span>
                      </div>
                    </div>
                  )}

                  <div className="mb-4 flex items-start justify-between pr-16">
                    <div>
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-600">
                        {org.type === 'COMPANY' ? '기업' : '연구기관'}
                      </p>
                    </div>
                  </div>

                  {org.industrySector && (
                    <div className="mb-2">
                      <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700">
                        {org.industrySector}
                      </span>
                    </div>
                  )}

                  {org.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                      {org.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {org.technologyReadinessLevel && (
                      <span>TRL {org.technologyReadinessLevel}</span>
                    )}
                    {org.rdExperience && <span>• R&D 경험</span>}
                  </div>

                  {(org.researchFocusAreas?.length > 0 || org.keyTechnologies?.length > 0) && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="text-xs text-gray-500">
                        {org.researchFocusAreas?.join(', ') || org.keyTechnologies?.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Why this match? Tooltip */}
                  {org.compatibility && org.compatibility.reasons.length > 0 && (
                    <div className="mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-3">
                      <div className="mb-1 flex items-center gap-1">
                        <svg
                          className="h-4 w-4 text-blue-600"
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
                        <span className="text-xs font-semibold text-gray-700">
                          왜 이 파트너인가요?
                        </span>
                      </div>
                      <ul className="ml-5 space-y-1">
                        {org.compatibility.reasons.slice(0, 2).map((reason, idx) => (
                          <li key={idx} className="text-xs text-gray-600">
                            • {reasonMap[reason] || reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/partners/${org.id}`);
                    }}
                    className="mt-4 w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    프로필 보기
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전
                </button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
    </DashboardLayout>
  );
}
