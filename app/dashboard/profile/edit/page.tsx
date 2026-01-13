'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Zod validation schema (same as create, but all fields optional for edit)
// User profile schema for professional profile fields
const userProfileSchema = z.object({
  linkedinUrl: z
    .string()
    .url('올바른 LinkedIn URL 형식을 입력해주세요.')
    .regex(
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/,
      'LinkedIn 프로필 URL 형식이 올바르지 않습니다. (예: https://linkedin.com/in/username)'
    )
    .optional()
    .or(z.literal('')),
  rememberUrl: z
    .string()
    .url('올바른 리멤버 URL 형식을 입력해주세요.')
    .regex(
      /^https?:\/\/(www\.)?rememberapp\.co\.kr\/.*$/,
      '리멤버 프로필 URL 형식이 올바르지 않습니다.'
    )
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(50, '직책은 50자 이하로 입력해주세요.')
    .optional()
    .or(z.literal('')),
  showOnPartnerProfile: z.boolean().default(false),
});

const organizationEditSchema = z.object({
  type: z.enum(['COMPANY', 'RESEARCH_INSTITUTE', 'UNIVERSITY', 'PUBLIC_INSTITUTION']).optional(),
  primaryContactEmail: z
    .string()
    .email('올바른 이메일 형식을 입력해주세요.')
    .optional()
    .or(z.literal('')),
  name: z
    .string()
    .min(2, '조직명은 2자 이상이어야 합니다.')
    .max(100, '조직명은 100자 이하여야 합니다.')
    .optional(),
  website: z
    .string()
    .url('올바른 웹사이트 주소를 입력해주세요. (예: https://example.com)')
    .optional()
    .or(z.literal('')),
  industrySector: z.string().min(1, '산업 분야를 선택해주세요.').optional(),
  employeeCount: z
    .enum(['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300'])
    .optional(),
  // Tier 1A: Company-specific eligibility fields
  revenueRange: z
    .enum(['NONE', 'UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B'])
    .optional()
    .nullable(),
  businessStructure: z.enum(['CORPORATION', 'SOLE_PROPRIETOR', 'GOVERNMENT_AGENCY']).optional().nullable(),
  rdExperienceCount: z.string().optional(), // National R&D project experience count
  certifications: z.array(z.string()).optional(),
  patentCount: z
    .number()
    .min(0, '특허 수는 0 이상이어야 합니다.')
    .max(999, '특허 수는 999 이하여야 합니다.')
    .optional()
    .nullable(),
  investmentHistory: z.string().optional().nullable(), // Investment amount text
  // Tier 1B: Algorithm enhancement fields
  collaborationCount: z
    .number()
    .min(0, '협력 횟수는 0 이상이어야 합니다.')
    .max(99, '협력 횟수는 99 이하여야 합니다.')
    .optional()
    .nullable(),
  // Tier 1B: Research institute specific fields
  researchFocusAreas: z.string().optional().nullable(),
  keyTechnologies: z.string().optional().nullable(),
  // Public institution specific field
  parentDepartment: z.string().max(100, '소속 부처는 100자 이하여야 합니다.').optional().nullable(),
  technologyReadinessLevel: z
    .number()
    .min(1, 'TRL은 1 이상이어야 합니다.')
    .max(9, 'TRL은 9 이하여야 합니다.')
    .nullable()
    .optional(),
  // Dual-TRL System: Target research TRL for R&D funding matching
  targetResearchTRL: z
    .number()
    .min(1, '연구개발 목표 TRL은 1 이상이어야 합니다.')
    .max(9, '연구개발 목표 TRL은 9 이하여야 합니다.')
    .nullable()
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.').nullable().optional(),
  // Consortium Preferences (optional)
  desiredConsortiumFields: z.string().optional().nullable(),
  desiredTechnologies: z.string().optional().nullable(),
  targetPartnerTRL: z
    .number()
    .min(1, '목표 TRL은 1 이상이어야 합니다.')
    .max(9, '목표 TRL은 9 이하여야 합니다.')
    .nullable()
    .optional(),
  commercializationCapabilities: z.string().optional().nullable(),
  expectedTRLLevel: z
    .number()
    .min(1, '목표 TRL은 1 이상이어야 합니다.')
    .max(9, '목표 TRL은 9 이하여야 합니다.')
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
  { value: 'DEFENSE', label: '방위/국방' },
  { value: 'CULTURAL', label: '문화/콘텐츠' },
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
  const [isCertDropdownOpen, setIsCertDropdownOpen] = useState(false);

  // User profile state (for professional profile fields)
  const [userProfileData, setUserProfileData] = useState<{
    linkedinUrl: string;
    rememberUrl: string;
    position: string;
    showOnPartnerProfile: boolean;
  }>({
    linkedinUrl: '',
    rememberUrl: '',
    position: '',
    showOnPartnerProfile: false,
  });

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

  const rdExperienceCount = watch('rdExperienceCount');
  const organizationType = watch('type');

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
        setValue('type', data.organization.type);
        setValue('primaryContactEmail', data.organization.primaryContactEmail || '');
        setValue('name', data.organization.name);
        setValue('website', data.organization.website || '');
        setValue('industrySector', data.organization.industrySector);
        setValue('employeeCount', data.organization.employeeCount);
        // Tier 1A fields
        setValue('revenueRange', data.organization.revenueRange);
        setValue('businessStructure', data.organization.businessStructure);
        setValue('patentCount', data.organization.patentCount);
        setValue('investmentHistory', data.organization.investmentHistory || '');
        // Convert rdExperience boolean to rdExperienceCount string for display
        setValue('rdExperienceCount', data.organization.rdExperience ? '1' : '0');
        // Tier 1B fields
        setValue('collaborationCount', data.organization.collaborationCount);
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
        setValue('targetResearchTRL', data.organization.targetResearchTRL);
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

        // Fetch user profile data (for professional profile fields)
        try {
          const userProfileRes = await fetch('/api/users/profile');
          if (userProfileRes.ok) {
            const userProfile = await userProfileRes.json();
            setUserProfileData({
              linkedinUrl: userProfile.linkedinUrl || '',
              rememberUrl: userProfile.rememberUrl || '',
              position: userProfile.position || '',
              showOnPartnerProfile: userProfile.showOnPartnerProfile || false,
            });
          }
        } catch (userProfileErr) {
          console.error('Error fetching user profile:', userProfileErr);
          // Non-critical error, continue without user profile data
        }

        setIsLoading(false);
      } catch (err: any) {
        setError('조직 정보를 불러올 수 없습니다.');
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

      // Update organization profile
      const orgResponse = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const orgResult = await orgResponse.json();

      if (!orgResponse.ok) {
        throw new Error(orgResult.error || '프로필 업데이트에 실패했습니다.');
      }

      // Update user profile (professional profile fields)
      const userProfileResponse = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfileData),
      });

      if (!userProfileResponse.ok) {
        const userResult = await userProfileResponse.json();
        console.error('User profile update failed:', userResult.error);
        // Non-critical error, continue to redirect
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
          <p className="mt-2 text-gray-600">최신 프로필 정보를 업데이트하고 향상된 연구과제와 컨소시엄 매칭 경험해 보세요.</p>
        </div>


        {/* Match Readiness Inline Prompt */}
        {organizationData && (
          !organizationData.keyTechnologies?.length || !organizationData.researchFocusAreas?.length
        ) && (
          <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-amber-800">매칭 품질을 높이세요.</h4>
                <p className="text-sm text-amber-700 mt-1">
                  연구 분야와 핵심 기술을 입력하면 귀사에 더 적합한 연구 과제를 추천받을 수 있습니다.
                </p>
              </div>
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

            {/* Organization Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                조직 유형
              </label>
              <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                    organizationType === 'COMPANY'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value="COMPANY"
                    {...register('type')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl">🏢</div>
                    <div className="mt-1 font-medium text-gray-900">기업</div>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                    organizationType === 'RESEARCH_INSTITUTE'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value="RESEARCH_INSTITUTE"
                    {...register('type')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl">🔬</div>
                    <div className="mt-1 font-medium text-gray-900">국가연구기관</div>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                    organizationType === 'UNIVERSITY'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value="UNIVERSITY"
                    {...register('type')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl">🎓</div>
                    <div className="mt-1 font-medium text-gray-900">대학</div>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                    organizationType === 'PUBLIC_INSTITUTION'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    value="PUBLIC_INSTITUTION"
                    {...register('type')}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="text-2xl">🏛️</div>
                    <div className="mt-1 font-medium text-gray-900">공공기관</div>
                  </div>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                이직 시 조직 유형을 변경하면 매칭 결과가 재생성됩니다.
              </p>
            </div>

            {/* Primary Contact Email */}
            <div>
              <label
                htmlFor="primaryContactEmail"
                className="block text-sm font-medium text-gray-700"
              >
                알림 수신 이메일
              </label>
              <input
                type="email"
                id="primaryContactEmail"
                {...register('primaryContactEmail')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="work@company.com"
              />
              <p className="mt-1 text-xs text-gray-500">
                새 매칭 알림, 마감 알림, 주간 리포트가 이 이메일로 발송됩니다.
              </p>
              {errors.primaryContactEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryContactEmail.message}</p>
              )}
            </div>

            {/* Organization Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                조직명
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

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700"
              >
                웹사이트
              </label>
              <input
                type="url"
                id="website"
                {...register('website')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="https://www.example.com"
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.website.message}
                </p>
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
                  🔒 사업자등록번호는 변경할 수 없습니다.
                </p>
              </div>
            )}

            {/* Industry Sector */}
            <div>
              <label
                htmlFor="industrySector"
                className="block text-sm font-medium text-gray-700"
              >
                산업 분야
              </label>
              <select
                id="industrySector"
                {...register('industrySector')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요.</option>
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
                직원 수
              </label>
              <select
                id="employeeCount"
                {...register('employeeCount')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요.</option>
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
                    연간 매출액
                  </label>
                  <select
                    id="revenueRange"
                    {...register('revenueRange')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택해주세요</option>
                    <option value="NONE">없음 (비영리기관)</option>
                    <option value="UNDER_1B">10억원 미만</option>
                    <option value="FROM_1B_TO_10B">10억원~100억원</option>
                    <option value="FROM_10B_TO_50B">100억원~500억원</option>
                    <option value="FROM_50B_TO_100B">500억원~1,000억원</option>
                    <option value="OVER_100B">1,000억원 이상</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    일부 프로그램은 매출액 기준이 있습니다(예: 중소기업 전용).
                  </p>
                  {errors.revenueRange && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.revenueRange.message}
                    </p>
                  )}
                </div>

                {/* Business Structure */}
                <div>
                  <label
                    htmlFor="businessStructure"
                    className="block text-sm font-medium text-gray-700"
                  >
                    사업 형태
                  </label>
                  <select
                    id="businessStructure"
                    {...register('businessStructure')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택해주세요.</option>
                    <option value="CORPORATION">법인</option>
                    <option value="SOLE_PROPRIETOR">개인사업자</option>
                    <option value="GOVERNMENT_AGENCY">국가기관</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    일부 연구과제는 법인 전용입니다.
                    국가연구기관은 인터넷에서 &ldquo;소속 기관명 + 설립 근거 법률&rdquo;로 검색. 대학은 법인, 공공기관은 국가기관을 선택.
                  </p>
                  {errors.businessStructure && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.businessStructure.message}
                    </p>
                  )}
                </div>

                {/* Certifications - Custom Multi-select dropdown with checkboxes */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보유 인증
                  </label>
                  {/* Dropdown trigger button */}
                  <button
                    type="button"
                    onClick={() => setIsCertDropdownOpen(!isCertDropdownOpen)}
                    className="mt-1 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-left focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <span className={selectedCertifications.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
                      {selectedCertifications.length === 0
                        ? '인증을 선택해주세요.'
                        : `${selectedCertifications.length}개 선택됨`}
                    </span>
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${isCertDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu with checkboxes */}
                  {isCertDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg">
                      <div className="max-h-60 overflow-y-auto p-2">
                        {commonCertifications.map((cert) => (
                          <label
                            key={cert.value}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCertifications.includes(cert.value)}
                              onChange={() => handleCertificationToggle(cert.value)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{cert.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-gray-200 p-2">
                        <button
                          type="button"
                          onClick={() => setIsCertDropdownOpen(false)}
                          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          확인
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Selected certifications display */}
                  {selectedCertifications.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedCertifications.map((certValue) => {
                        const cert = commonCertifications.find(c => c.value === certValue);
                        return (
                          <span
                            key={certValue}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
                          >
                            {cert?.label || certValue}
                            <button
                              type="button"
                              onClick={() => {
                                const newCerts = selectedCertifications.filter(c => c !== certValue);
                                setSelectedCertifications(newCerts);
                                setValue('certifications', newCerts);
                              }}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    일부 연구과제는 보유인증 기준이 있습니다.
                  </p>
                </div>

                {/* Patent Count */}
                <div>
                  <label
                    htmlFor="patentCount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    보유 특허
                  </label>
                  <input
                    type="number"
                    id="patentCount"
                    {...register('patentCount', { valueAsNumber: true })}
                    min="0"
                    max="999"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    등록 특허와 출원 특허를 합산하여 입력해주세요. 보유 특허 수가 0인 경우 0을 입력해 주세요.
                  </p>
                  {errors.patentCount && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.patentCount.message}
                    </p>
                  )}
                </div>

                {/* Investment History (Simplified) */}
                <div>
                  <label
                    htmlFor="investmentHistory"
                    className="block text-sm font-medium text-gray-700"
                  >
                    누적 투자 유치 금액
                  </label>
                  <input
                    type="text"
                    id="investmentHistory"
                    {...register('investmentHistory')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 5억원"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    VC, 엔젤투자, 기업 투자 등을 합산하여 입력해주세요(일부 연구과제는 투자 유치 실적 필수). 투자 유치 실적이 없으면 없음을 입력해 주세요.
                  </p>
                  {errors.investmentHistory && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.investmentHistory.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* National R&D Experience Count */}
            <div>
              <label
                htmlFor="rdExperienceCount"
                className="block text-sm font-medium text-gray-700"
              >
                국가 R&D과제 수행 경험
              </label>
              <select
                id="rdExperienceCount"
                {...register('rdExperienceCount')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요.</option>
                <option value="0">없음</option>
                <option value="1">1회</option>
                <option value="2">2회</option>
                <option value="3">3회</option>
                <option value="4">4회</option>
                <option value="5">5회</option>
                <option value="6">6회</option>
                <option value="7">7회</option>
                <option value="8">8회</option>
                <option value="9">9회</option>
                <option value="10">10회</option>
                <option value="11">11회</option>
                <option value="12">12회</option>
                <option value="13">13회</option>
                <option value="14">14회</option>
                <option value="15+">15회 이상</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                국가 R&D과제 수행 경험 횟수를 선택해주세요.
              </p>
            </div>

            {/* Tier 1B: Collaboration Count (shown when R&D experience exists) */}
            {rdExperienceCount && rdExperienceCount !== '0' && (
              <div>
                <label
                  htmlFor="collaborationCount"
                  className="block text-sm font-medium text-gray-700"
                >
                  산학/기관 협력 프로젝트 수행 횟수
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
                  산학협력, 기관 간 공동연구 등의 경험이 있다면 입력해주세요(매칭 점수 +2~5점).
                </p>
                {errors.collaborationCount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.collaborationCount.message}
                  </p>
                )}
              </div>
            )}

            {/* Dual-TRL System: Current Technology TRL + Target Research TRL */}
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-900">기술 성숙도 (TRL) 설정</h4>

              {/* Current Technology TRL */}
              <div>
                <label
                  htmlFor="technologyReadinessLevel"
                  className="block text-sm font-medium text-gray-700"
                >
                  기존 보유 기술 수준
                </label>
                <select
                  id="technologyReadinessLevel"
                  {...register('technologyReadinessLevel', {
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
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
                  <option value="9">TRL 9 - 상용화 완료</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  현재 보유 중인 기술 또는 제품의 성숙도를 선택해주세요.
                </p>
                {errors.technologyReadinessLevel && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.technologyReadinessLevel.message}
                  </p>
                )}
              </div>

              {/* Target Research TRL - for R&D funding matching */}
              <div>
                <label
                  htmlFor="targetResearchTRL"
                  className="block text-sm font-medium text-gray-700"
                >
                  연구개발하려는 기술 수준
                </label>
                <select
                  id="targetResearchTRL"
                  {...register('targetResearchTRL', {
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
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
                  국가 R&D 과제 공고 매칭에 사용됩니다. 신규 연구개발하고자 하는 기술의 목표 수준을 선택해주세요.
                </p>
                {errors.targetResearchTRL && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.targetResearchTRL.message}
                  </p>
                )}
              </div>
            </div>

            {/* Tier 1B: Research Institute and University specific fields */}
            {(organizationData?.type === 'RESEARCH_INSTITUTE' || organizationData?.type === 'UNIVERSITY') && (
              <>
                {/* Research Focus Areas */}
                <div>
                  <label
                    htmlFor="researchFocusAreas"
                    className="block text-sm font-medium text-gray-700"
                  >
                    주요 연구 분야
                  </label>
                  <input
                    type="text"
                    id="researchFocusAreas"
                    {...register('researchFocusAreas')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 문화유산 디지털화, 전시기술, K-Culture AI (쉼표로 구분)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 연구 분야를 입력하면 더 정확한 연구 과제 매칭을 받을 수 있습니다.
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
                    핵심 보유 기술
                  </label>
                  <input
                    type="text"
                    id="keyTechnologies"
                    {...register('keyTechnologies')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: AR/VR, 디지털 아카이빙, 콘텐츠 관리 시스템 (쉼표로 구분)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 핵심 기술을 입력하면 더 정확한 연구 과제 매칭을 받을 수 있습니다.
                  </p>
                  {errors.keyTechnologies && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.keyTechnologies.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Public Institution specific fields */}
            {organizationData?.type === 'PUBLIC_INSTITUTION' && (
              <>
                {/* Parent Department */}
                <div>
                  <label
                    htmlFor="parentDepartment"
                    className="block text-sm font-medium text-gray-700"
                  >
                    소속 부처/기관
                  </label>
                  <input
                    type="text"
                    id="parentDepartment"
                    {...register('parentDepartment')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 문화체육관광부, 과학기술정보통신부"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 소속 부처 정보를 입력하면 관련 부처 지원 사업 매칭을 받을 수 있습니다.
                  </p>
                  {errors.parentDepartment && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parentDepartment.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Key Technologies - Available for COMPANY and PUBLIC_INSTITUTION */}
            {(organizationData?.type === 'COMPANY' || organizationData?.type === 'PUBLIC_INSTITUTION') && (
              <div>
                <label
                  htmlFor="keyTechnologies"
                  className="block text-sm font-medium text-gray-700"
                >
                  핵심 보유 기술
                </label>
                <input
                  type="text"
                  id="keyTechnologies"
                  {...register('keyTechnologies')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 문화기술(CT), 디지털 콘텐츠, AR/VR (쉼표로 구분)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 핵심 기술을 입력하면 더 정확한 연구 과제 매칭을 받을 수 있습니다.
                </p>
                {errors.keyTechnologies && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.keyTechnologies.message}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                조직 설명
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder={
                  organizationData?.type === 'COMPANY'
                    ? '예: 당사는 AI 기반 의료영상 진단 솔루션을 개발하는 헬스케어 스타트업입니다. 딥러닝 영상처리, 의료 AI, 클라우드 SaaS 기술을 보유하고 있으며, 현재 TRL 6 단계로 파일럿 임상시험을 진행 중입니다. 대학병원 및 연구기관과의 공동연구를 통해 상용화를 목표로 하고 있습니다.'
                    : organizationData?.type === 'RESEARCH_INSTITUTE'
                      ? '예: 본 연구소는 문화유산 디지털화 및 AR/VR 전시기술 연구에 특화된 정부출연연구기관입니다. 3D 스캐닝, 메타버스 콘텐츠 개발, AI 기반 이미지 복원 기술을 보유하고 있으며, TRL 3-4 수준의 원천기술을 기업 기술이전 및 컨소시엄 공동연구를 통해 상용화하고자 합니다.'
                      : organizationData?.type === 'UNIVERSITY'
                        ? '예: 본 연구실은 신소재공학과 소속으로 이차전지 양극재 및 차세대 에너지 저장 소재 연구를 수행하고 있습니다. 나노소재 합성, 전기화학 분석, 배터리 셀 설계 기술을 보유하고 있으며, 기업과의 산학협력을 통해 TRL 1-3 기초연구 결과를 실용화 단계까지 발전시키고자 합니다.'
                        : '예: 본 기관은 과학기술정보통신부 산하 공공기관으로 중소기업 R&D 지원 및 기술사업화를 담당합니다. 기술평가, 사업화 컨설팅, R&D 기획 역량을 보유하고 있으며, 산학연 컨소시엄 구성 및 정부 R&D 과제 기획에 참여하고 있습니다.'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                조직 설명은 파트너 검색 시 키워드 매칭에 활용됩니다. 주요 연구 분야, 핵심 기술, 협력 희망 분야를 구체적으로 작성해주세요.
              </p>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Personal Professional Profile Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                담당자 프로필 (선택)
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                파트너 검색 시 신뢰도 확인을 위해 표시됩니다. 학력, 경력 정보를 확인할 수 있어 컨소시엄 구성에 도움이 됩니다.
              </p>

              {/* Position/Title */}
              <div className="mb-4">
                <label
                  htmlFor="position"
                  className="block text-sm font-medium text-gray-700"
                >
                  직책
                </label>
                <input
                  type="text"
                  id="position"
                  value={userProfileData.position}
                  onChange={(e) =>
                    setUserProfileData((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                  placeholder="예: 대표, 연구책임자, CTO"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500">
                  파트너 프로필에 표시될 직책입니다.
                </p>
              </div>

              {/* LinkedIn URL */}
              <div className="mb-4">
                <label
                  htmlFor="linkedinUrl"
                  className="block text-sm font-medium text-gray-700"
                >
                  LinkedIn 프로필
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </span>
                  <input
                    type="url"
                    id="linkedinUrl"
                    value={userProfileData.linkedinUrl}
                    onChange={(e) =>
                      setUserProfileData((prev) => ({
                        ...prev,
                        linkedinUrl: e.target.value,
                      }))
                    }
                    placeholder="https://linkedin.com/in/username"
                    className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-lg border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  LinkedIn 프로필 URL을 입력하면 파트너가 학력, 경력 정보를 확인할 수 있습니다.
                </p>
              </div>

              {/* Remember URL */}
              <div className="mb-4">
                <label
                  htmlFor="rememberUrl"
                  className="block text-sm font-medium text-gray-700"
                >
                  리멤버 프로필
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-[#FF6B35] text-sm font-bold">
                    R
                  </span>
                  <input
                    type="url"
                    id="rememberUrl"
                    value={userProfileData.rememberUrl}
                    onChange={(e) =>
                      setUserProfileData((prev) => ({
                        ...prev,
                        rememberUrl: e.target.value,
                      }))
                    }
                    placeholder="https://rememberapp.co.kr/..."
                    className="flex-1 min-w-0 block w-full px-4 py-2 rounded-none rounded-r-lg border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  리멤버 프로필 URL을 입력하면 파트너가 명함 정보와 경력을 확인할 수 있습니다.
                </p>
              </div>

              {/* Visibility Toggle */}
              <div className="flex items-start mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center h-5">
                  <input
                    id="showOnPartnerProfile"
                    type="checkbox"
                    checked={userProfileData.showOnPartnerProfile}
                    onChange={(e) =>
                      setUserProfileData((prev) => ({
                        ...prev,
                        showOnPartnerProfile: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="showOnPartnerProfile"
                    className="font-medium text-gray-700"
                  >
                    파트너 검색 페이지에 내 프로필 표시
                  </label>
                  <p className="text-gray-500">
                    체크 시 다른 기업이 귀사 정보를 볼 때 내 프로필(직책, LinkedIn, 리멤버)이 함께 표시됩니다.
                  </p>
                </div>
              </div>
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
                      컨소시엄 파트너 선호도
                    </h3>
                    <p className="text-sm text-gray-600">
                      원하는 파트너 유형을 설정하면 더 정확한 매칭을 받을 수 있습니다.
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
                          원하는 협업 분야
                        </label>
                        <input
                          type="text"
                          id="desiredConsortiumFields"
                          {...register('desiredConsortiumFields')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: AI, 빅데이터, 클라우드 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          파트너와 함께 연구하고 싶은 기술 분야를 입력해주세요.
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
                          필요한 기술 역량을 가진 컨소시엄 파트너를 찾아드립니다.
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
                          <option value="">선택해주세요.</option>
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
                          초기 단계 기술(TRL 1-4)이나 상용화 단계(TRL 7-9) 중 선택하세요.
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
                          원하는 협업 분야
                        </label>
                        <input
                          type="text"
                          id="desiredConsortiumFields"
                          {...register('desiredConsortiumFields')}
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                          placeholder="예: ICT, 바이오, 에너지 (쉼표로 구분)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          협업하고 싶은 산업 분야를 입력해주세요.
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
                          기업에 제공 가능한 기술을 입력해주세요.
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
                          기업의 사업화를 지원할 수 있는 역량을 입력해주세요.
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
                          <option value="">선택해주세요.</option>
                          <option value="4">TRL 4 - 실험실 환경 검증</option>
                          <option value="5">TRL 5 - 유사 환경 검증</option>
                          <option value="6">TRL 6 - 파일럿 실증</option>
                          <option value="7">TRL 7 - 실제 환경 시연</option>
                          <option value="8">TRL 8 - 시스템 완성 및 검증</option>
                          <option value="9">TRL 9 - 상용화</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          협업을 통해 도달하고자 하는 TRL 수준을 선택해주세요.
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
                          <option value="">선택해주세요.</option>
                          <option value="UNDER_10">10명 미만 (스타트업)</option>
                          <option value="FROM_10_TO_50">10~50명 (소기업)</option>
                          <option value="FROM_50_TO_100">50~100명 (중소기업)</option>
                          <option value="FROM_100_TO_300">100~300명 (중견기업)</option>
                          <option value="OVER_300">300명 이상 (대기업)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          협업하고 싶은 기업의 규모를 선택해주세요.
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
                          <option value="">선택해주세요.</option>
                          <option value="UNDER_1B">10억원 미만</option>
                          <option value="FROM_1B_TO_10B">10억원~100억원</option>
                          <option value="FROM_10B_TO_50B">100억원~500억원</option>
                          <option value="FROM_50B_TO_100B">500억원~1,000억원</option>
                          <option value="OVER_100B">1,000억원 이상</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          협업하고 싶은 기업의 매출 규모를 선택해주세요.
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
                          선호도를 자세히 입력할수록 귀하의 목표에 맞는 최적의 컨소시엄 파트너를
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
                      완성도가 높을수록 더 정확한 매칭이 가능합니다.
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
