'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// Zod validation schema
const organizationSchema = z.object({
  type: z.enum(['COMPANY', 'RESEARCH_INSTITUTE'], {
    required_error: '조직 유형을 선택해주세요',
  }),
  name: z
    .string()
    .min(2, '조직명은 2자 이상이어야 합니다')
    .max(100, '조직명은 100자 이하여야 합니다'),
  businessNumber: z
    .string()
    .regex(
      /^\d{3}-\d{2}-\d{5}$/,
      '사업자등록번호 형식이 올바르지 않습니다 (예: 123-45-67890)'
    ),
  industrySector: z.string().min(1, '산업 분야를 선택해주세요'),
  employeeCount: z.enum(
    ['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300'],
    {
      required_error: '직원 수를 선택해주세요',
    }
  ),
  // Tier 1A: Company-specific eligibility fields (for filtering programs)
  revenueRange: z
    .enum(['UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B'])
    .optional(),
  businessStructure: z.enum(['CORPORATION', 'SOLE_PROPRIETOR']).optional(),
  rdExperience: z.boolean(),
  // Tier 1B: Algorithm enhancement fields
  collaborationCount: z
    .number()
    .min(0, '협력 횟수는 0 이상이어야 합니다')
    .max(99, '협력 횟수는 99 이하여야 합니다')
    .optional(),
  // Tier 1B: Research institute specific fields
  instituteType: z.enum(['UNIVERSITY', 'GOVERNMENT', 'PRIVATE']).optional(),
  researchFocusAreas: z.string().optional(), // Comma-separated string
  keyTechnologies: z.string().optional(), // Comma-separated string
  technologyReadinessLevel: z
    .number()
    .min(1, 'TRL은 1 이상이어야 합니다')
    .max(9, 'TRL은 9 이하여야 합니다')
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다').optional(),
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
  { value: 'OTHER', label: '기타' },
];

export default function CreateOrganizationProfilePage() {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      type: 'COMPANY',
      rdExperience: false,
    },
  });

  const organizationType = watch('type');
  const rdExperience = watch('rdExperience');

  const onSubmit = async (data: OrganizationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '조직 프로필 생성에 실패했습니다');
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            조직 프로필 생성
          </h1>
          <p className="mt-2 text-gray-600">
            펀딩 매칭을 위해 조직 정보를 입력해주세요
          </p>
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
              <div className="mt-2 grid grid-cols-2 gap-4">
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
                    <div className="mt-1 font-medium text-gray-900">연구소</div>
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
                🔒 PIPA 규정에 따라 AES-256 암호화로 안전하게 보관됩니다
              </p>
              {errors.businessNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.businessNumber.message}
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
            {organizationType === 'COMPANY' && (
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

            {/* Technology Readiness Level (TRL) - Show if R&D experience OR research institute */}
            {(rdExperience || organizationType === 'RESEARCH_INSTITUTE') && (
              <div>
                <label
                  htmlFor="technologyReadinessLevel"
                  className="block text-sm font-medium text-gray-700"
                >
                  기술성숙도 (TRL)
                </label>
                <select
                  id="technologyReadinessLevel"
                  {...register('technologyReadinessLevel', {
                    valueAsNumber: true,
                  })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">선택해주세요 (선택사항)</option>
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
            )}

            {/* Tier 1B: Research Institute specific fields */}
            {organizationType === 'RESEARCH_INSTITUTE' && (
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
            <li>4개 주요 기관 (IITP, KEIT, TIPA, KIMST) 펀딩 매칭</li>
            <li>설명 가능한 AI 매칭 알고리즘</li>
            <li>실시간 공고 알림</li>
          </ul>
        </div>
      </div>
    </div>
  );
}