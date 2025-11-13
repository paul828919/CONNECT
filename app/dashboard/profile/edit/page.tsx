'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Zod validation schema (same as create, but all fields optional for edit)
const organizationEditSchema = z.object({
  name: z
    .string()
    .min(2, '조직명은 2자 이상이어야 합니다')
    .max(100, '조직명은 100자 이하여야 합니다')
    .optional(),
  industrySector: z.string().min(1, '산업 분야를 선택해주세요').optional(),
  employeeCount: z
    .enum(['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300'])
    .optional(),
  // Tier 1A: Company-specific eligibility fields
  revenueRange: z
    .enum(['UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B'])
    .optional()
    .nullable(),
  businessStructure: z.enum(['CORPORATION', 'SOLE_PROPRIETOR']).optional().nullable(),
  rdExperience: z.boolean().optional(),
  certifications: z.array(z.string()).optional(),
  // Tier 1B: Algorithm enhancement fields
  collaborationCount: z
    .number()
    .min(0, '협력 횟수는 0 이상이어야 합니다')
    .max(99, '협력 횟수는 99 이하여야 합니다')
    .optional()
    .nullable(),
  // Tier 1B: Research institute specific fields
  instituteType: z.enum(['UNIVERSITY', 'GOVERNMENT', 'PRIVATE']).optional().nullable(),
  researchFocusAreas: z.string().optional().nullable(),
  keyTechnologies: z.string().optional().nullable(),
  technologyReadinessLevel: z
    .number()
    .min(1, 'TRL은 1 이상이어야 합니다')
    .max(9, 'TRL은 9 이하여야 합니다')
    .nullable()
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다').nullable().optional(),
  // Consortium Preferences (optional)
  desiredConsortiumFields: z.string().optional().nullable(),
  desiredTechnologies: z.string().optional().nullable(),
  targetPartnerTRL: z
    .number()
    .min(1, '목표 TRL은 1 이상이어야 합니다')
    .max(9, '목표 TRL은 9 이하여야 합니다')
    .nullable()
    .optional(),
  commercializationCapabilities: z.string().optional().nullable(),
  expectedTRLLevel: z
    .number()
    .min(1, '목표 TRL은 1 이상이어야 합니다')
    .max(9, '목표 TRL은 9 이하여야 합니다')
    .nullable()
    .optional(),
  targetOrgScale: z
    .enum(['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300'])
    .optional()
    .nullable(),
  targetOrgRevenue: z
    .enum(['UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B'])
    .optional()
    .nullable(),
});

type OrganizationEditData = z.infer<typeof organizationEditSchema>;

const industrySectors = [
  { value: 'ICT', label: 'ICT (정보통신)' },
  { value: 'BIO_HEALTH', label: '바이오/헬스' },
  { value: 'MANUFACTURING', label: '제조업' },
  { value: 'ENERGY', label: '에너지' },
  { value: 'ENVIRONMENT', label: '환경' },
  { value: 'AGRICULTURE', label: '농업' },
  { value: 'MARINE', label: '해양수산' },
  { value: 'CONSTRUCTION', label: '건설' },
  { value: 'TRANSPORTATION', label: '교통/운송' },
  { value: 'OTHER', label: '기타' },
];

// Common certifications for eligibility filtering
const commonCertifications = [
  { value: '벤처기업', label: '벤처기업' },
  { value: 'INNO-BIZ', label: 'INNO-BIZ (기술혁신형 중소기업)' },
  { value: '연구개발전담부서', label: '연구개발전담부서' },
  { value: '기업부설연구소', label: '기업부설연구소' },
  { value: '메인비즈', label: '메인비즈 (Main-Biz)' },
  { value: '중소기업', label: '중소기업 확인서' },
  { value: '스타트업', label: '창업기업 (7년 이내)' },
];

export default function EditOrganizationProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [showConsortiumPreferences, setShowConsortiumPreferences] = useState(false);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);

  // Check if redirected from partner search page with preferences flag
  useEffect(() => {
    if (searchParams.get('preferences') === 'true') {
      setShowConsortiumPreferences(true);
      // Scroll to consortium preferences section after a brief delay
      setTimeout(() => {
        const element = document.getElementById('consortium-preferences-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrganizationEditData>({
    resolver: zodResolver(organizationEditSchema),
  });

  const rdExperience = watch('rdExperience');

  // Handler for certification checkbox toggle
  const handleCertificationToggle = (certValue: string) => {
    setSelectedCertifications((prev) => {
      const newCerts = prev.includes(certValue)
        ? prev.filter((c) => c !== certValue)
        : [...prev, certValue];
      setValue('certifications', newCerts);
      return newCerts;
    });
  };

  // Fetch current organization data
  useEffect(() => {
    async function fetchOrganization() {
      try {
        const organizationId = (session?.user as any)?.organizationId;
        if (!organizationId) {
          router.push('/dashboard/profile/create');
          return;
        }

        const response = await fetch(`/api/organizations/${organizationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch organization');
        }

        const data = await response.json();
        setOrganizationData(data.organization);

        // Pre-populate form
        setValue('name', data.organization.name);
        setValue('industrySector', data.organization.industrySector);
        setValue('employeeCount', data.organization.employeeCount);
        // Tier 1A fields
        setValue('revenueRange', data.organization.revenueRange);
        setValue('businessStructure', data.organization.businessStructure);
        setValue('rdExperience', data.organization.rdExperience);
        // Tier 1B fields
        setValue('collaborationCount', data.organization.collaborationCount);
        setValue('instituteType', data.organization.instituteType);
        // Convert array to comma-separated string for display
        setValue(
          'researchFocusAreas',
          data.organization.researchFocusAreas?.join(', ') || ''
        );
        setValue(
          'keyTechnologies',
          data.organization.keyTechnologies?.join(', ') || ''
        );
        setValue('technologyReadinessLevel', data.organization.technologyReadinessLevel);
        setValue('description', data.organization.description);

        // Consortium preferences
        setValue(
          'desiredConsortiumFields',
          data.organization.desiredConsortiumFields?.join(', ') || ''
        );
        setValue(
          'desiredTechnologies',
          data.organization.desiredTechnologies?.join(', ') || ''
        );
        setValue('targetPartnerTRL', data.organization.targetPartnerTRL);
        setValue(
          'commercializationCapabilities',
          data.organization.commercializationCapabilities?.join(', ') || ''
        );
        setValue('expectedTRLLevel', data.organization.expectedTRLLevel);
        setValue('targetOrgScale', data.organization.targetOrgScale);
        setValue('targetOrgRevenue', data.organization.targetOrgRevenue);

        // Set certifications
        if (data.organization.certifications) {
          setSelectedCertifications(data.organization.certifications);
          setValue('certifications', data.organization.certifications);
        }

        // Auto-expand consortium preferences if any field has data
        if (
          data.organization.desiredConsortiumFields?.length > 0 ||
          data.organization.desiredTechnologies?.length > 0 ||
          data.organization.targetPartnerTRL ||
          data.organization.commercializationCapabilities?.length > 0 ||
          data.organization.expectedTRLLevel ||
          data.organization.targetOrgScale ||
          data.organization.targetOrgRevenue
        ) {
          setShowConsortiumPreferences(true);
        }

        setIsLoading(false);
      } catch (err: any) {
        setError('조직 정보를 불러올 수 없습니다');
        setIsLoading(false);
      }
    }

    if (session) {
      fetchOrganization();
    }
  }, [session, router, setValue]);

  const onSubmit = async (data: OrganizationEditData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const organizationId = (session?.user as any)?.organizationId;
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '프로필 업데이트에 실패했습니다');
      }

      // Update session
      await update();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">프로필 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">프로필 수정</h1>
          <p className="mt-2 text-gray-600">조직 정보를 업데이트하세요</p>
        </div>

        {/* Organization Type Badge (Read-only) */}
        {organizationData && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-blue-50 p-4">
            <div className="text-2xl">
              {organizationData.type === 'COMPANY' ? '🏢' : '🔬'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">조직 유형</p>
              <p className="text-lg font-semibold text-gray-900">
                {organizationData.type === 'COMPANY' ? '기업' : '연구소'}
              </p>
              <p className="text-xs text-gray-500">
                조직 유형은 변경할 수 없습니다
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Organization Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                조직명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="예: (주)테크이노베이션"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Business Number (Read-only) */}
            {organizationData && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  사업자등록번호
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500">
                  <span>●●●-●●-●●●●●</span>
                  <span className="ml-2 text-xs text-gray-400">
                    (보안상 표시되지 않음)
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  🔒 사업자등록번호는 변경할 수 없습니다
                </p>
              </div>
            )}

            {/* Industry Sector */}
            <div>
              <label
                htmlFor="industrySector"
                className="block text-sm font-medium text-gray-700"
              >
                산업 분야 <span className="text-red-500">*</span>
              </label>
              <select
                id="industrySector"
                {...register('industrySector')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요</option>
                {industrySectors.map((sector) => (
                  <option key={sector.value} value={sector.value}>
                    {sector.label}
                  </option>
                ))}
              </select>
              {errors.industrySector && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.industrySector.message}
                </p>
              )}
            </div>

            {/* Employee Count */}
            <div>
              <label
                htmlFor="employeeCount"
                className="block text-sm font-medium text-gray-700"
              >
                직원 수 <span className="text-red-500">*</span>
              </label>
              <select
                id="employeeCount"
                {...register('employeeCount')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요</option>
                <option value="UNDER_10">10명 미만</option>
                <option value="FROM_10_TO_50">10~50명</option>
                <option value="FROM_50_TO_100">50~100명</option>
                <option value="FROM_100_TO_300">100~300명</option>
                <option value="OVER_300">300명 이상</option>
              </select>
              {errors.employeeCount && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.employeeCount.message}
                </p>
              )}
            </div>

            {/* Tier 1A: Company-specific fields */}
            {organizationData?.type === 'COMPANY' && (
              <>
                {/* Revenue Range */}
                <div>
                  <label
                    htmlFor="revenueRange"
                    className="block text-sm font-medium text-gray-700"
                  >
                    연간 매출액 (선택사항)
                  </label>
                  <select
                    id="revenueRange"
                    {...register('revenueRange')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택해주세요</option>
                    <option value="UNDER_1B">10억원 미만</option>
                    <option value="FROM_1B_TO_10B">10억원~100억원</option>
                    <option value="FROM_10B_TO_50B">100억원~500억원</option>
                    <option value="FROM_50B_TO_100B">500억원~1,000억원</option>
                    <option value="OVER_100B">1,000억원 이상</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    일부 프로그램은 매출액 기준이 있습니다 (예: 중소기업 전용)
                  </p>
                  {errors.revenueRange && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.revenueRange.message}
                    </p>
                  )}
                </div>

                {/* Business Structure */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    사업자 형태 (선택사항)
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                        watch('businessStructure') === 'CORPORATION'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="CORPORATION"
                        {...register('businessStructure')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl">🏛️</div>
                        <div className="mt-1 font-medium text-gray-900">법인</div>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                        watch('businessStructure') === 'SOLE_PROPRIETOR'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="SOLE_PROPRIETOR"
                        {...register('businessStructure')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-2xl">👤</div>
                        <div className="mt-1 font-medium text-gray-900">개인사업자</div>
                      </div>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    일부 프로그램은 법인 전용입니다
                  </p>
                  {errors.businessStructure && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.businessStructure.message}
                    </p>
                  )}
                </div>

                {/* Certifications */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보유 인증 (선택사항)
                  </label>
                  <div className="space-y-2">
                    {commonCertifications.map((cert) => (
                      <label
                        key={cert.value}
                        className="flex items-start cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCertifications.includes(cert.value)}
                          onChange={() => handleCertificationToggle(cert.value)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{cert.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    보유 인증에 따라 지원 가능한 프로그램이 필터링됩니다
                  </p>
                </div>
              </>
            )}

            {/* R&D Experience */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="rdExperience"
                {...register('rdExperience')}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="rdExperience"
                className="ml-2 block text-sm text-gray-700"
              >
                정부 R&D 과제 수행 경험이 있습니다
              </label>
            </div>

            {/* Tier 1B: Collaboration Count (shown when R&D experience is true) */}
            {rdExperience && (
              <div>
                <label
                  htmlFor="collaborationCount"
                  className="block text-sm font-medium text-gray-700"
                >
                  산학/기관 협력 프로젝트 수행 횟수 (선택사항)
                </label>
                <input
                  type="number"
                  id="collaborationCount"
                  {...register('collaborationCount', { valueAsNumber: true })}
                  min="0"
                  max="99"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-gray-500">
                  산학협력, 기관 간 공동연구 등의 경험이 있다면 입력해주세요 (매칭 점수 +2~5점)
                </p>
                {errors.collaborationCount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.collaborationCount.message}
                  </p>
                )}
              </div>
            )}

            {/* Technology Readiness Level (TRL) - Always visible (independent of R&D experience) */}
            <div>
              <label
                htmlFor="technologyReadinessLevel"
                className="block text-sm font-medium text-gray-700"
              >
                기술성숙도 (TRL) <span className="text-gray-500 text-xs font-normal">(선택사항)</span>
              </label>
              <select
                id="technologyReadinessLevel"
                {...register('technologyReadinessLevel', {
                  valueAsNumber: true,
                })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요</option>
                <option value="1">TRL 1 - 기초 원리 연구</option>
                <option value="2">TRL 2 - 기술 개념 정립</option>
                <option value="3">TRL 3 - 개념 증명</option>
                <option value="4">TRL 4 - 실험실 환경 검증</option>
                <option value="5">TRL 5 - 유사 환경 검증</option>
                <option value="6">TRL 6 - 파일럿 실증</option>
                <option value="7">TRL 7 - 실제 환경 시연</option>
                <option value="8">TRL 8 - 시스템 완성 및 검증</option>
                <option value="9">TRL 9 - 상용화</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                현재 보유 중인 기술의 성숙도를 선택해주세요
              </p>
              {errors.technologyReadinessLevel && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.technologyReadinessLevel.message}
                </p>
              )}
            </div>

            {/* Tier 1B: Research Institute specific fields */}
            {organizationData?.type === 'RESEARCH_INSTITUTE' && (
              <>
                {/* Institute Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    연구소 유형 (선택사항)
                  </label>
                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-all ${
                        watch('instituteType') === 'UNIVERSITY'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="UNIVERSITY"
                        {...register('instituteType')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-xl">🎓</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">대학</div>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-all ${
                        watch('instituteType') === 'GOVERNMENT'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="GOVERNMENT"
                        {...register('instituteType')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-xl">🏛️</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">정부출연</div>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 transition-all ${
                        watch('instituteType') === 'PRIVATE'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        value="PRIVATE"
                        {...register('instituteType')}
                        className="sr-only"
                      />
                      <div className="text-center">
                        <div className="text-xl">🏢</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">민간</div>
                      </div>
                    </label>
                  </div>
                  {errors.instituteType && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.instituteType.message}
                    </p>
                  )}
                </div>

                {/* Research Focus Areas */}
                <div>
                  <label
                    htmlFor="researchFocusAreas"
                    className="block text-sm font-medium text-gray-700"
                  >
                    주요 연구 분야 (선택사항)
                  </label>
                  <input
                    type="text"
                    id="researchFocusAreas"
                    {...register('researchFocusAreas')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: AI, 빅데이터, 클라우드 (쉼표로 구분)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    여러 분야는 쉼표(,)로 구분해주세요
                  </p>
                  {errors.researchFocusAreas && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.researchFocusAreas.message}
                    </p>
                  )}
                </div>

                {/* Key Technologies */}
                <div>
                  <label
                    htmlFor="keyTechnologies"
                    className="block text-sm font-medium text-gray-700"
                  >
                    핵심 보유 기술 (선택사항)
                  </label>
                  <input
                    type="text"
                    id="keyTechnologies"
                    {...register('keyTechnologies')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 머신러닝, 자연어처리, 컴퓨터비전 (쉼표로 구분)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    여러 기술은 쉼표(,)로 구분해주세요
                  </p>
                  {errors.keyTechnologies && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.keyTechnologies.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                조직 설명 (선택사항)
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="조직의 주요 사업 분야, 보유 기술, R&D 역량 등을 간단히 설명해주세요"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Consortium Preferences (Collapsible, Optional) */}
            <div id="consortium-preferences-section" className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setShowConsortiumPreferences(!showConsortiumPreferences)}
                className="flex w-full items-center justify-between rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 p-4 transition-all hover:from-purple-100 hover:to-blue-100"
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🤝</div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">
                      컨소시엄 파트너 선호도 (선택사항)
                    </h3>
                    <p className="text-sm text-gray-600">
                      원하는 파트너 유형을 설정하면 더 정확한 매칭을 받을 수 있습니다
                    </p>
                  </div>
                </div>
                <svg
                  className={`h-6 w-6 text-gray-600 transition-transform ${
                    showConsortiumPreferences ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showConsortiumPreferences && (
                <div className="mt-4 space-y-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
                  {/* Company-specific consortium preferences */}
                  {organizationData?.type === 'COMPANY' && (
                    <>
                      {/* Desired Consortium Fields */}
                      <div>
                        <label
                          htmlFor="desiredConsortiumFields"
                          className="block text-sm font-medium text-gray-700"
                        >
                          원하는 협력 분야
                        </label>
                        <input
                          type="text"
                          id="desiredConsortiumFields"
                          {...register('desiredConsortiumFields')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: AI, 빅데이터, 클라우드 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          파트너와 함께 연구하고 싶은 기술 분야를 입력해주세요
                        </p>
                      </div>

                      {/* Desired Technologies */}
                      <div>
                        <label
                          htmlFor="desiredTechnologies"
                          className="block text-sm font-medium text-gray-700"
                        >
                          찾고 있는 기술
                        </label>
                        <input
                          type="text"
                          id="desiredTechnologies"
                          {...register('desiredTechnologies')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: 머신러닝, 자연어처리, 컴퓨터비전 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          필요한 기술 역량을 가진 파트너를 찾아드립니다
                        </p>
                      </div>

                      {/* Target Partner TRL */}
                      <div>
                        <label
                          htmlFor="targetPartnerTRL"
                          className="block text-sm font-medium text-gray-700"
                        >
                          원하는 파트너의 TRL 수준
                        </label>
                        <select
                          id="targetPartnerTRL"
                          {...register('targetPartnerTRL', {
                            valueAsNumber: true,
                          })}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">선택해주세요</option>
                          <option value="1">TRL 1 - 기초 원리 연구</option>
                          <option value="2">TRL 2 - 기술 개념 정립</option>
                          <option value="3">TRL 3 - 개념 증명</option>
                          <option value="4">TRL 4 - 실험실 환경 검증</option>
                          <option value="5">TRL 5 - 유사 환경 검증</option>
                          <option value="6">TRL 6 - 파일럿 실증</option>
                          <option value="7">TRL 7 - 실제 환경 시연</option>
                          <option value="8">TRL 8 - 시스템 완성 및 검증</option>
                          <option value="9">TRL 9 - 상용화</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          초기 단계 기술(TRL 1-4)이나 상용화 단계(TRL 7-9) 중 선택하세요
                        </p>
                        {errors.targetPartnerTRL && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.targetPartnerTRL.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Research Institute-specific consortium preferences */}
                  {organizationData?.type === 'RESEARCH_INSTITUTE' && (
                    <>
                      {/* Desired Consortium Fields */}
                      <div>
                        <label
                          htmlFor="desiredConsortiumFields"
                          className="block text-sm font-medium text-gray-700"
                        >
                          원하는 협력 분야
                        </label>
                        <input
                          type="text"
                          id="desiredConsortiumFields"
                          {...register('desiredConsortiumFields')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: ICT, 바이오, 에너지 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          협력하고 싶은 산업 분야를 입력해주세요
                        </p>
                      </div>

                      {/* Desired Technologies */}
                      <div>
                        <label
                          htmlFor="desiredTechnologies"
                          className="block text-sm font-medium text-gray-700"
                        >
                          기술이전 가능 기술
                        </label>
                        <input
                          type="text"
                          id="desiredTechnologies"
                          {...register('desiredTechnologies')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: AI 모델 최적화, 데이터 분석 플랫폼 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          기업에 제공 가능한 기술을 입력해주세요
                        </p>
                      </div>

                      {/* Commercialization Capabilities */}
                      <div>
                        <label
                          htmlFor="commercializationCapabilities"
                          className="block text-sm font-medium text-gray-700"
                        >
                          사업화 지원 역량
                        </label>
                        <input
                          type="text"
                          id="commercializationCapabilities"
                          {...register('commercializationCapabilities')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: 시제품 제작, 기술 검증, 인증 지원 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          기업의 사업화를 지원할 수 있는 역량을 입력해주세요
                        </p>
                      </div>

                      {/* Expected TRL Level */}
                      <div>
                        <label
                          htmlFor="expectedTRLLevel"
                          className="block text-sm font-medium text-gray-700"
                        >
                          목표 TRL 수준
                        </label>
                        <select
                          id="expectedTRLLevel"
                          {...register('expectedTRLLevel', {
                            valueAsNumber: true,
                          })}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">선택해주세요</option>
                          <option value="4">TRL 4 - 실험실 환경 검증</option>
                          <option value="5">TRL 5 - 유사 환경 검증</option>
                          <option value="6">TRL 6 - 파일럿 실증</option>
                          <option value="7">TRL 7 - 실제 환경 시연</option>
                          <option value="8">TRL 8 - 시스템 완성 및 검증</option>
                          <option value="9">TRL 9 - 상용화</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          협력을 통해 도달하고자 하는 TRL 수준을 선택해주세요
                        </p>
                        {errors.expectedTRLLevel && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.expectedTRLLevel.message}
                          </p>
                        )}
                      </div>

                      {/* Target Organization Scale */}
                      <div>
                        <label
                          htmlFor="targetOrgScale"
                          className="block text-sm font-medium text-gray-700"
                        >
                          선호하는 기업 규모
                        </label>
                        <select
                          id="targetOrgScale"
                          {...register('targetOrgScale')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">선택해주세요</option>
                          <option value="UNDER_10">10명 미만 (스타트업)</option>
                          <option value="FROM_10_TO_50">10~50명 (소기업)</option>
                          <option value="FROM_50_TO_100">50~100명 (중소기업)</option>
                          <option value="FROM_100_TO_300">100~300명 (중견기업)</option>
                          <option value="OVER_300">300명 이상 (대기업)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          협력하고 싶은 기업의 규모를 선택해주세요
                        </p>
                      </div>

                      {/* Target Organization Revenue */}
                      <div>
                        <label
                          htmlFor="targetOrgRevenue"
                          className="block text-sm font-medium text-gray-700"
                        >
                          선호하는 기업 매출 규모
                        </label>
                        <select
                          id="targetOrgRevenue"
                          {...register('targetOrgRevenue')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="">선택해주세요</option>
                          <option value="UNDER_1B">10억원 미만</option>
                          <option value="FROM_1B_TO_10B">10억원~100억원</option>
                          <option value="FROM_10B_TO_50B">100억원~500억원</option>
                          <option value="FROM_50B_TO_100B">500억원~1,000억원</option>
                          <option value="OVER_100B">1,000억원 이상</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          협력하고 싶은 기업의 매출 규모를 선택해주세요
                        </p>
                      </div>
                    </>
                  )}

                  {/* Info box */}
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="flex gap-2">
                      <div className="text-blue-600">ℹ️</div>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">더 나은 매칭을 위한 팁</p>
                        <p className="mt-1">
                          선호도를 자세히 입력할수록 여러분의 목표에 맞는 최적의 파트너를
                          추천받을 수 있습니다. 나중에 언제든지 수정 가능합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Score Display */}
            {organizationData && (
              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      프로필 완성도
                    </p>
                    <p className="text-xs text-gray-500">
                      완성도가 높을수록 더 정확한 매칭이 가능합니다
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {organizationData.profileScore}%
                  </div>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    저장 중...
                  </span>
                ) : (
                  '변경사항 저장'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
