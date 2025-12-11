'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Zod validation schema
const organizationSchema = z.object({
  type: z.enum(['COMPANY', 'RESEARCH_INSTITUTE', 'UNIVERSITY', 'PUBLIC_INSTITUTION'], {
    required_error: '조직 유형을 선택해주세요.',
  }),
  name: z
    .string()
    .min(2, '조직명은 2자 이상이어야 합니다.')
    .max(100, '조직명은 100자 이하여야 합니다.'),
  businessNumber: z
    .string()
    .regex(
      /^\d{3}-\d{2}-\d{5}$/,
      '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)'
    ),
  industrySector: z.string().min(1, '산업 분야를 선택해주세요.'),
  employeeCount: z.enum(
    ['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300'],
    {
      required_error: '직원 수를 선택해주세요.',
    }
  ),
  // Tier 1A: Company-specific eligibility fields (for filtering programs)
  revenueRange: z
    .enum(['NONE', 'UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B'])
    .optional(),
  businessStructure: z.enum(['CORPORATION', 'SOLE_PROPRIETOR']).optional(),
  businessEstablishedDate: z.string().optional(), // ISO date string, will be converted to Date in API
  rdExperienceCount: z.string().optional(), // National R&D project experience count
  // Tier 1B: Algorithm enhancement fields
  collaborationCount: z
    .number()
    .min(0, '협력 횟수는 0 이상이어야 합니다.')
    .max(99, '협력 횟수는 99 이하여야 합니다.')
    .optional(),
  // Phase 2: Eligibility fields (certifications, investment, patents, research institute)
  certifications: z.array(z.string()).optional(),
  investmentHistory: z.string().optional(), // JSON string of investment records
  patentCount: z
    .number()
    .min(0, '특허 수는 0 이상이어야 합니다.')
    .max(999, '특허 수는 999 이하여야 합니다.')
    .optional(),
  // Tier 1B: Research institute specific fields
  instituteType: z.enum(['UNIVERSITY', 'GOVERNMENT', 'PRIVATE']).optional(),
  researchFocusAreas: z.string().optional(), // Comma-separated string
  keyTechnologies: z.string().optional(), // Comma-separated string
  // Public institution specific field
  parentDepartment: z.string().max(100, '소속 부처는 100자 이하여야 합니다.').optional(), // e.g., 문화체육관광부
  technologyReadinessLevel: z
    .number()
    .min(1, 'TRL은 1 이상이어야 합니다.')
    .max(9, 'TRL은 9 이하여야 합니다.')
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
  website: z
    .string()
    .url('올바른 웹사이트 주소를 입력해주세요. (예: https://example.com)')
    .optional()
    .or(z.literal('')),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

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

export default function CreateOrganizationProfilePage() {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [isCertDropdownOpen, setIsCertDropdownOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      type: 'COMPANY',
      rdExperienceCount: '',
      certifications: [],
    },
  });

  const organizationType = watch('type');
  const rdExperienceCount = watch('rdExperienceCount');

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

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare payload with proper type conversions
      const payload = {
        ...data,
        certifications: selectedCertifications,
        businessEstablishedDate: data.businessEstablishedDate
          ? new Date(data.businessEstablishedDate).toISOString()
          : undefined,
      };

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '조직 프로필 생성에 실패했습니다.');
      }

      // Update session to include new organizationId
      await update();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">조직 프로필 생성</h1>
          <p className="mt-2 text-gray-600">조직 정보를 업데이트하세요</p>
        </div>

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
                조직 유형 <span className="text-red-500">*</span>
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
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

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

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="block text-sm font-medium text-gray-700"
              >
                웹사이트 <span className="text-red-500">*</span>
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

            {/* Business Number */}
            <div>
              <label
                htmlFor="businessNumber"
                className="block text-sm font-medium text-gray-700"
              >
                사업자등록번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="businessNumber"
                {...register('businessNumber')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="123-45-67890"
                maxLength={12}
              />
              <p className="mt-1 text-xs text-gray-500">
                🔒 PIPA 규정에 따라 AES-256 암호화로 안전하게 보관됩니다.
              </p>
              {errors.businessNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.businessNumber.message}
                </p>
              )}
            </div>

            {/* Business Structure */}
            <div>
              <label
                htmlFor="businessStructure"
                className="block text-sm font-medium text-gray-700"
              >
                사업 형태 <span className="text-red-500">*</span>
              </label>
              <select
                id="businessStructure"
                {...register('businessStructure')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요.</option>
                <option value="CORPORATION">법인</option>
                <option value="SOLE_PROPRIETOR">개인사업자</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                일부 연구과제는 법인 전용입니다.
              </p>
              {errors.businessStructure && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.businessStructure.message}
                </p>
              )}
            </div>

            {/* Business Established Date */}
            <div>
              <label
                htmlFor="businessEstablishedDate"
                className="block text-sm font-medium text-gray-700"
              >
                사업자 설립일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="businessEstablishedDate"
                {...register('businessEstablishedDate')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                일부 연구과제는 업력 기준이 있습니다. (예: 창업 7년 이내)
              </p>
              {errors.businessEstablishedDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.businessEstablishedDate.message}
                </p>
              )}
            </div>

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
                직원 수 <span className="text-red-500">*</span>
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
            {organizationType === 'COMPANY' && (
              <>
                {/* Revenue Range */}
                <div>
                  <label
                    htmlFor="revenueRange"
                    className="block text-sm font-medium text-gray-700"
                  >
                    연간 매출액 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="revenueRange"
                    {...register('revenueRange')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택해주세요.</option>
                    <option value="NONE">없음 (비영리기관)</option>
                    <option value="UNDER_1B">10억원 미만</option>
                    <option value="FROM_1B_TO_10B">10억원~100억원</option>
                    <option value="FROM_10B_TO_50B">100억원~500억원</option>
                    <option value="FROM_50B_TO_100B">500억원~1,000억원</option>
                    <option value="OVER_100B">1,000억원 이상</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    일부 연구과제는 매출액 기준이 있습니다. (예: 중소기업 전용)
                  </p>
                  {errors.revenueRange && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.revenueRange.message}
                    </p>
                  )}
                </div>

                {/* Certifications - Custom Multi-select dropdown with checkboxes */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보유 인증 <span className="text-red-500">*</span>
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
                    보유 특허 <span className="text-red-500">*</span>
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
                    누적 투자 유치 금액 <span className="text-red-500">*</span>
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
                국가 R&D과제 수행 경험 <span className="text-red-500">*</span>
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
                  산학연 컨소시엄 연구과제 참여 <span className="text-red-500">*</span>
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
                  산학연간 공동연구 경험이 있다면 입력해주세요(매칭 점수 +2~5점).
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
                기술성숙도(TRL) <span className="text-red-500">*</span>
              </label>
              <select
                id="technologyReadinessLevel"
                {...register('technologyReadinessLevel', {
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
                현재 보유 중인 기술의 성숙도를 선택해주세요.
              </p>
              {errors.technologyReadinessLevel && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.technologyReadinessLevel.message}
                </p>
              )}
            </div>

            {/* Tier 1B: Research Institute and University specific fields */}
            {(organizationType === 'RESEARCH_INSTITUTE' || organizationType === 'UNIVERSITY') && (
              <>
                {/* Institute Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    연구기관 유형 <span className="text-red-500">*</span>
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
                    주요 연구 분야 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="researchFocusAreas"
                    {...register('researchFocusAreas')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 문화유산 디지털화, 전시기술, K-Culture AI(쉼표로 구분)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 연구 분야를 입력하면 더 정확한 연구과제 매칭을 받을 수 있습니다.
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
                    보유 핵심 기술 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="keyTechnologies"
                    {...register('keyTechnologies')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: AR/VR, 디지털 아카이빙, 콘텐츠 관리 시스템 (쉼표로 구분)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 핵심 기술을 입력하면 더 정확한 연구과제 매칭을 받을 수 있습니다.
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
            {organizationType === 'PUBLIC_INSTITUTION' && (
              <>
                {/* Parent Department */}
                <div>
                  <label
                    htmlFor="parentDepartment"
                    className="block text-sm font-medium text-gray-700"
                  >
                    소속 부처/기관 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="parentDepartment"
                    {...register('parentDepartment')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="예: 문화체육관광부, 과학기술정보통신부"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    💡 소속 부처 정보를 입력하면 관련 부처의 연구과제를 매칭 받을 수 있습니다.
                  </p>
                  {errors.parentDepartment && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parentDepartment.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Key Technologies - Available for COMPANY and PUBLIC_INSTITUTION (RESEARCH_INSTITUTE and UNIVERSITY have their own) */}
            {(organizationType === 'COMPANY' || organizationType === 'PUBLIC_INSTITUTION') && (
              <div>
                <label
                  htmlFor="keyTechnologies"
                  className="block text-sm font-medium text-gray-700"
                >
                  핵심 보유 기술 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="keyTechnologies"
                  {...register('keyTechnologies')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 문화기술(CT), 디지털 콘텐츠, AR/VR (쉼표로 구분)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 핵심 기술을 입력하면 더 정확한 연구과제 매칭을 받을 수 있습니다.
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
                조직 설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="조직의 주요 사업 분야, 보유 기술, R&D 역량 등을 간단히 설명해주세요."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
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
                    프로필 생성 중...
                  </span>
                ) : (
                  '프로필 생성'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-medium">💡 프로필 완성 후 이용 가능</p>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li>NTIS 기반 전체 국가 R&D 연구 과제 매칭</li>
            <li>컨소시엄 구축</li>
            <li>주간 연구과제 공고 분석 알림</li>
            <li>사용자 맞춤형 매칭 및 추천</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}