'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  rdExperience: z.boolean().optional(),
  technologyReadinessLevel: z
    .number()
    .min(1, 'TRL은 1 이상이어야 합니다')
    .max(9, 'TRL은 9 이하여야 합니다')
    .nullable()
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다').nullable().optional(),
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

export default function EditOrganizationProfilePage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationData, setOrganizationData] = useState<any>(null);

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
        setValue('rdExperience', data.organization.rdExperience);
        setValue('technologyReadinessLevel', data.organization.technologyReadinessLevel);
        setValue('description', data.organization.description);

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

            {/* Technology Readiness Level (TRL) */}
            {rdExperience && (
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
