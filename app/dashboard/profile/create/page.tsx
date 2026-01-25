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
  primaryContactEmail: z
    .string()
    .min(1, '알림 수신 이메일을 입력해주세요.')
    .email('올바른 이메일 형식을 입력해주세요.'),
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
  businessStructure: z.enum(['CORPORATION', 'SOLE_PROPRIETOR', 'GOVERNMENT_AGENCY']).optional(),
  businessEstablishedDate: z.string().optional(), // ISO date string, will be converted to Date in API
  // Company Scale Type (기업 규모 분류) - for 중소벤처기업부 program matching
  companyScaleType: z.enum(['STARTUP', 'SME', 'MID_SIZED', 'LARGE_ENTERPRISE']).optional(),
  // Location fields (소재지 정보) - for regional R&D program matching
  headquartersRegion: z.string().optional(), // Required for regional matching
  researchCenterRegion: z.string().optional(), // Optional
  factoryRegion: z.string().optional(), // Optional
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
  researchFocusAreas: z.string().optional(), // Comma-separated string
  keyTechnologies: z.string().optional(), // Comma-separated string
  // v5.0: Enhanced profile fields for improved matching quality
  primaryBusinessDomain: z.string().max(100).optional(),
  technologyDomainsSpecific: z.string().optional(), // Comma-separated string
  // Public institution specific field
  parentDepartment: z.string().max(100, '소속 부처는 100자 이하여야 합니다.').optional(), // e.g., 문화체육관광부
  technologyReadinessLevel: z
    .number()
    .min(1, 'TRL은 1 이상이어야 합니다.')
    .max(9, 'TRL은 9 이하여야 합니다.')
    .optional(),
  // Dual-TRL System: Target research TRL for R&D funding matching
  targetResearchTRL: z
    .number()
    .min(1, '연구개발 목표 TRL은 1 이상이어야 합니다.')
    .max(9, '연구개발 목표 TRL은 9 이하여야 합니다.')
    .nullable()
    .optional(),
  description: z.string().max(500, '설명은 500자 이하여야 합니다.').optional(),
  website: z
    .string()
    .url('올바른 웹사이트 주소를 입력해주세요. (예: https://example.com)')
    .optional()
    .or(z.literal('')),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

// Industry sectors - select based on product/service domain, not business activity
// Note: "Manufacturing" removed - capture manufacturing capability via certifications instead
const industrySectors = [
  { value: 'ICT', label: 'ICT (정보통신)' },
  { value: 'BIO_HEALTH', label: '바이오/헬스 (인체·동물의약, 의료기기, 백신, 생명공학 포함)' },
  { value: 'ENERGY', label: '에너지' },
  { value: 'ENVIRONMENT', label: '환경' },
  { value: 'AGRICULTURE', label: '농업/식품' },
  { value: 'MARINE', label: '해양수산' },
  { value: 'CONSTRUCTION', label: '건설' },
  { value: 'TRANSPORTATION', label: '교통/운송' },
  { value: 'DEFENSE', label: '방위/국방' },
  { value: 'CULTURAL', label: '문화/콘텐츠' },
  { value: 'OTHER', label: '기타' },
];

// Semantic sub-domain options for industry-specific matching (v3.0)
const semanticSubDomainOptions: Record<string, {
  primaryField: { key: string; label: string; options: { value: string; label: string }[] };
  secondaryField?: { key: string; label: string; options: { value: string; label: string }[] };
}> = {
  BIO_HEALTH: {
    primaryField: {
      key: 'targetOrganism',
      label: '대상 생물',
      options: [
        { value: 'HUMAN', label: '인체' },
        { value: 'ANIMAL', label: '동물' },
        { value: 'PLANT', label: '식물' },
        { value: 'MICROBIAL', label: '미생물' },
        { value: 'MARINE', label: '해양생물' },
      ],
    },
    secondaryField: {
      key: 'applicationArea',
      label: '적용 분야',
      options: [
        { value: 'PHARMA', label: '의약품' },
        { value: 'MEDICAL_DEVICE', label: '의료기기' },
        { value: 'DIAGNOSTICS', label: '진단' },
        { value: 'DIGITAL_HEALTH', label: '디지털 헬스케어' },
        { value: 'VETERINARY_PHARMA', label: '동물의약품' },
        { value: 'VETERINARY_DEVICE', label: '동물의료기기' },
        { value: 'BIO_MATERIAL', label: '바이오소재' },
        { value: 'COSMETICS', label: '화장품/바이오코스메틱' },
        { value: 'FOOD_HEALTH', label: '건강기능식품' },
      ],
    },
  },
  ICT: {
    primaryField: {
      key: 'targetMarket',
      label: '타겟 시장',
      options: [
        { value: 'CONSUMER', label: '일반 소비자 (B2C)' },
        { value: 'ENTERPRISE', label: '기업 (B2B)' },
        { value: 'GOVERNMENT', label: '공공기관 (B2G)' },
        { value: 'INDUSTRIAL', label: '산업용' },
      ],
    },
    secondaryField: {
      key: 'applicationArea',
      label: '적용 분야',
      options: [
        { value: 'SOFTWARE', label: '소프트웨어' },
        { value: 'HARDWARE', label: '하드웨어' },
        { value: 'PLATFORM', label: '플랫폼' },
        { value: 'INFRASTRUCTURE', label: '인프라' },
        { value: 'SECURITY', label: '보안' },
        { value: 'AI_ML', label: 'AI/머신러닝' },
        { value: 'DATA_ANALYTICS', label: '데이터 분석' },
        { value: 'CLOUD', label: '클라우드' },
        { value: 'IOT', label: 'IoT' },
        { value: 'NETWORK', label: '네트워크/통신' },
        { value: 'GAMING', label: '게임' },
        { value: 'METAVERSE', label: '메타버스/XR' },
      ],
    },
  },
  ENERGY: {
    primaryField: {
      key: 'energySource',
      label: '에너지원',
      options: [
        { value: 'SOLAR', label: '태양광' },
        { value: 'WIND', label: '풍력' },
        { value: 'NUCLEAR', label: '원자력' },
        { value: 'HYDROGEN', label: '수소' },
        { value: 'BATTERY', label: '배터리/이차전지' },
        { value: 'GRID', label: '전력망' },
        { value: 'FOSSIL', label: '화석연료' },
        { value: 'GEOTHERMAL', label: '지열' },
        { value: 'HYDRO', label: '수력' },
      ],
    },
    secondaryField: {
      key: 'applicationArea',
      label: '적용 분야',
      options: [
        { value: 'GENERATION', label: '발전' },
        { value: 'STORAGE', label: '저장' },
        { value: 'DISTRIBUTION', label: '배전' },
        { value: 'EFFICIENCY', label: '효율' },
        { value: 'ELECTRIC_VEHICLE', label: '전기차' },
      ],
    },
  },
  AGRICULTURE: {
    primaryField: {
      key: 'targetSector',
      label: '대상 분야',
      options: [
        { value: 'CROPS', label: '작물' },
        { value: 'LIVESTOCK', label: '축산' },
        { value: 'AQUACULTURE', label: '양식/수산' },
        { value: 'FORESTRY', label: '임업' },
        { value: 'FOOD_PROCESSING', label: '식품가공' },
      ],
    },
    secondaryField: {
      key: 'applicationArea',
      label: '적용 분야',
      options: [
        { value: 'CULTIVATION', label: '재배' },
        { value: 'BREEDING', label: '육종' },
        { value: 'PROCESSING', label: '가공' },
        { value: 'DISTRIBUTION', label: '유통' },
        { value: 'SMART_FARM', label: '스마트팜' },
      ],
    },
  },
  DEFENSE: {
    primaryField: {
      key: 'targetDomain',
      label: '작전 영역',
      options: [
        { value: 'LAND', label: '지상' },
        { value: 'NAVAL', label: '해상' },
        { value: 'AEROSPACE', label: '항공우주' },
        { value: 'CYBER', label: '사이버' },
        { value: 'SPACE', label: '우주' },
      ],
    },
    secondaryField: {
      key: 'applicationArea',
      label: '적용 분야',
      options: [
        { value: 'WEAPONS', label: '무기체계' },
        { value: 'SYSTEMS', label: '체계/시스템' },
        { value: 'LOGISTICS', label: '군수' },
        { value: 'C4ISR', label: '지휘통제통신' },
        { value: 'PROTECTION', label: '방호' },
      ],
    },
  },
};

// Common certifications for eligibility filtering
const commonCertifications = [
  // Company certifications
  { value: '벤처기업', label: '벤처기업' },
  { value: 'INNO-BIZ', label: 'INNO-BIZ (기술혁신형 중소기업)' },
  { value: '연구개발전담부서', label: '연구개발전담부서' },
  { value: '기업부설연구소', label: '기업부설연구소' },
  { value: '메인비즈', label: '메인비즈 (Main-Biz)' },
  { value: '중소기업', label: '중소기업 확인서' },
  { value: '스타트업', label: '창업기업 (7년 이내)' },
  // Manufacturing certifications (added for industry-agnostic manufacturing capability)
  { value: 'GMP', label: 'GMP (의약품 제조품질관리기준)' },
  { value: 'KVGMP', label: 'KVGMP (동물용의약품 제조품질관리기준)' },
  { value: 'GLP', label: 'GLP (비임상시험관리기준)' },
  { value: 'ISO9001', label: 'ISO 9001 (품질경영시스템)' },
  { value: 'ISO13485', label: 'ISO 13485 (의료기기 품질경영)' },
  { value: '의약품제조업허가', label: '의약품 제조업 허가' },
  { value: '동물약품제조업허가', label: '동물약품 제조업 허가' },
  { value: '의료기기제조업허가', label: '의료기기 제조업 허가' },
];

// Korean administrative regions for location selectors
const koreanRegions = [
  { value: 'SEOUL', label: '서울특별시' },
  { value: 'GYEONGGI', label: '경기도' },
  { value: 'INCHEON', label: '인천광역시' },
  { value: 'BUSAN', label: '부산광역시' },
  { value: 'DAEGU', label: '대구광역시' },
  { value: 'GWANGJU', label: '광주광역시' },
  { value: 'DAEJEON', label: '대전광역시' },
  { value: 'ULSAN', label: '울산광역시' },
  { value: 'SEJONG', label: '세종특별자치시' },
  { value: 'GANGWON', label: '강원특별자치도' },
  { value: 'CHUNGBUK', label: '충청북도' },
  { value: 'CHUNGNAM', label: '충청남도' },
  { value: 'JEONBUK', label: '전북특별자치도' },
  { value: 'JEONNAM', label: '전라남도' },
  { value: 'GYEONGBUK', label: '경상북도' },
  { value: 'GYEONGNAM', label: '경상남도' },
  { value: 'JEJU', label: '제주특별자치도' },
];

// Company scale type options for SME program matching
const companyScaleTypes = [
  { value: 'STARTUP', label: '스타트업 (창업기업)', description: '업력 7년 이내' },
  { value: 'SME', label: '중소기업', description: '중소기업기본법 해당' },
  { value: 'MID_SIZED', label: '중견기업', description: '중견기업 특별법 해당' },
  { value: 'LARGE_ENTERPRISE', label: '대기업', description: '공정거래법 해당' },
];

export default function CreateOrganizationProfilePage() {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [isCertDropdownOpen, setIsCertDropdownOpen] = useState(false);
  // Semantic sub-domain state (v3.0 - industry-specific matching)
  const [semanticSubDomain, setSemanticSubDomain] = useState<Record<string, string>>({});

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
  const industrySector = watch('industrySector');

  // Get semantic sub-domain options for the selected industry
  const currentSemanticOptions = industrySector ? semanticSubDomainOptions[industrySector] : null;

  // Handler for semantic sub-domain field changes
  const handleSemanticSubDomainChange = (key: string, value: string) => {
    setSemanticSubDomain((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear semantic sub-domain when industry changes
  const handleIndustrySectorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValue('industrySector', e.target.value);
    setSemanticSubDomain({}); // Reset semantic data when industry changes
  };

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
      // Only include semanticSubDomain if it has at least one field populated
      const hasSemanticData = Object.keys(semanticSubDomain).length > 0 &&
        Object.values(semanticSubDomain).some((v) => v && v.length > 0);

      // Prepare locations array from individual region fields
      const locations: { locationType: string; region: string }[] = [];
      if (data.headquartersRegion) {
        locations.push({ locationType: 'HEADQUARTERS', region: data.headquartersRegion });
      }
      if (data.researchCenterRegion) {
        locations.push({ locationType: 'RESEARCH_CENTER', region: data.researchCenterRegion });
      }
      if (data.factoryRegion) {
        locations.push({ locationType: 'FACTORY', region: data.factoryRegion });
      }

      const payload = {
        ...data,
        primaryContactEmail: data.primaryContactEmail,
        certifications: selectedCertifications,
        businessEstablishedDate: data.businessEstablishedDate
          ? new Date(data.businessEstablishedDate).toISOString()
          : undefined,
        // Semantic sub-domain for v3.0 matching algorithm
        semanticSubDomain: hasSemanticData ? semanticSubDomain : undefined,
        // Company scale type for 중소벤처기업부 program matching (v4.1)
        companyScaleType: data.companyScaleType || undefined,
        // Locations for regional R&D program matching (v4.1)
        locations: locations.length > 0 ? locations : undefined,
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

      // Save user profile (professional profile fields) after organization creation
      if (userProfileData.linkedinUrl || userProfileData.rememberUrl || userProfileData.position || userProfileData.showOnPartnerProfile) {
        try {
          const userProfileResponse = await fetch('/api/users/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfileData),
          });

          if (!userProfileResponse.ok) {
            console.error('User profile update failed:', await userProfileResponse.json());
            // Non-critical error, continue to redirect
          }
        } catch (userProfileErr) {
          console.error('Error saving user profile:', userProfileErr);
          // Non-critical error, continue to redirect
        }
      }

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
          <p className="mt-2 text-gray-600">프로필을 완성하고 연구과제 매칭을 시작해 보세요</p>
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
                조직 유형              </label>
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

            {/* Primary Contact Email */}
            <div>
              <label
                htmlFor="primaryContactEmail"
                className="block text-sm font-medium text-gray-700"
              >
                알림 수신 이메일              </label>
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
                조직명              </label>
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
                웹사이트              </label>
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
                사업자등록번호, 고유번호              </label>
              <input
                type="text"
                id="businessNumber"
                {...register('businessNumber')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="123-45-67890"
                maxLength={12}
              />
              <p className="mt-1 text-xs text-gray-500">
                🔒 PIPA 규정에 따라 AES-256 암호화로 안전하게 보관됩니다. 대학은 산학협력단의 사업자등록번호를 입력하세요.
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
                사업 형태              </label>
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

            {/* Business Established Date */}
            <div>
              <label
                htmlFor="businessEstablishedDate"
                className="block text-sm font-medium text-gray-700"
              >
                사업자 설립일              </label>
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

            {/* Company Scale Type - for COMPANY type (중소벤처기업부 matching) */}
            {organizationType === 'COMPANY' && (
              <div>
                <label
                  htmlFor="companyScaleType"
                  className="block text-sm font-medium text-gray-700"
                >
                  기업 규모 분류
                </label>
                <select
                  id="companyScaleType"
                  {...register('companyScaleType')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">선택해주세요</option>
                  {companyScaleTypes.map((scale) => (
                    <option key={scale.value} value={scale.value}>
                      {scale.label} - {scale.description}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  💡 중소기업현황정보시스템(SMINFO)에서 &apos;중소기업 확인서&apos;를 발급받아 확인 가능합니다. 중소벤처기업부 R&D 사업 매칭에 사용됩니다.
                </p>
                {errors.companyScaleType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.companyScaleType.message}
                  </p>
                )}
              </div>
            )}

            {/* Company Locations - for COMPANY type (regional R&D matching) */}
            {organizationType === 'COMPANY' && (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">소재지 정보</h4>
                    <p className="text-xs text-gray-600">
                      지역별 R&D 지원사업 매칭을 위해 소재지 정보를 입력해주세요. 지역 특화 사업 (부산/울산/경남, 비수도권 전용 등) 매칭에 활용됩니다.
                    </p>
                  </div>
                </div>

                {/* Headquarters Location (본사) */}
                <div>
                  <label
                    htmlFor="headquartersRegion"
                    className="block text-sm font-medium text-gray-700"
                  >
                    본사 소재지
                  </label>
                  <select
                    id="headquartersRegion"
                    {...register('headquartersRegion')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택해주세요</option>
                    {koreanRegions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Research Center Location (연구소) - Optional */}
                <div>
                  <label
                    htmlFor="researchCenterRegion"
                    className="block text-sm font-medium text-gray-700"
                  >
                    연구소 소재지 (선택)
                  </label>
                  <select
                    id="researchCenterRegion"
                    {...register('researchCenterRegion')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택 안함</option>
                    {koreanRegions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    기업부설연구소가 있는 경우에만 입력
                  </p>
                </div>

                {/* Factory Location (공장) - Optional */}
                <div>
                  <label
                    htmlFor="factoryRegion"
                    className="block text-sm font-medium text-gray-700"
                  >
                    공장 소재지 (선택)
                  </label>
                  <select
                    id="factoryRegion"
                    {...register('factoryRegion')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택 안함</option>
                    {koreanRegions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    제조시설이 있는 경우에만 입력
                  </p>
                </div>
              </div>
            )}

            {/* Industry Sector */}
            <div>
              <label
                htmlFor="industrySector"
                className="block text-sm font-medium text-gray-700"
              >
                산업 분야              </label>
              <select
                id="industrySector"
                value={industrySector || ''}
                onChange={handleIndustrySectorChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">선택해주세요.</option>
                {industrySectors.map((sector) => (
                  <option key={sector.value} value={sector.value}>
                    {sector.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                💡 제품/서비스가 속한 산업을 기준으로 선택하세요. 제조 능력은 아래 인증에서 선택할 수 있습니다.
              </p>
              {errors.industrySector && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.industrySector.message}
                </p>
              )}
            </div>

            {/* Semantic Sub-Domain (v3.0 - Industry-specific matching) */}
            {currentSemanticOptions && (
              <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">🎯</span>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">세부 분야 설정 (선택)</h4>
                    <p className="text-xs text-gray-600">
                      세부 분야를 선택하면 더 정확한 연구과제 매칭을 받을 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* Primary Field (Hard filter field - e.g., targetOrganism for BIO_HEALTH) */}
                <div>
                  <label
                    htmlFor={`semantic-${currentSemanticOptions.primaryField.key}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {currentSemanticOptions.primaryField.label}
                    <span className="ml-1 text-xs font-normal text-blue-600">(매칭 핵심 기준)</span>
                  </label>
                  <select
                    id={`semantic-${currentSemanticOptions.primaryField.key}`}
                    value={semanticSubDomain[currentSemanticOptions.primaryField.key] || ''}
                    onChange={(e) =>
                      handleSemanticSubDomainChange(currentSemanticOptions.primaryField.key, e.target.value)
                    }
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">선택해주세요</option>
                    {currentSemanticOptions.primaryField.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {industrySector === 'BIO_HEALTH' && '예: 동물의약품 회사라면 "동물" 선택 → 인체 대상 프로그램이 매칭에서 제외됩니다.'}
                    {industrySector === 'ICT' && '예: B2B 소프트웨어 회사라면 "기업 (B2B)" 선택 → 소비자 대상 프로그램이 매칭에서 제외됩니다.'}
                    {industrySector === 'ENERGY' && '예: 배터리 회사라면 "배터리/이차전지" 선택 → 원자력 프로그램이 매칭에서 제외됩니다.'}
                    {industrySector === 'AGRICULTURE' && '예: 축산 회사라면 "축산" 선택 → 작물 재배 프로그램이 매칭에서 제외됩니다.'}
                    {industrySector === 'DEFENSE' && '예: 항공우주 회사라면 "항공우주" 선택 → 해상 무기 프로그램이 매칭에서 제외됩니다.'}
                  </p>
                </div>

                {/* Secondary Field (Soft scoring field - applicationArea) */}
                {currentSemanticOptions.secondaryField && (
                  <div>
                    <label
                      htmlFor={`semantic-${currentSemanticOptions.secondaryField.key}`}
                      className="block text-sm font-medium text-gray-700"
                    >
                      {currentSemanticOptions.secondaryField.label}
                    </label>
                    <select
                      id={`semantic-${currentSemanticOptions.secondaryField.key}`}
                      value={semanticSubDomain[currentSemanticOptions.secondaryField.key] || ''}
                      onChange={(e) =>
                        handleSemanticSubDomainChange(currentSemanticOptions.secondaryField!.key, e.target.value)
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">선택해주세요</option>
                      {currentSemanticOptions.secondaryField.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Employee Count */}
            <div>
              <label
                htmlFor="employeeCount"
                className="block text-sm font-medium text-gray-700"
              >
                직원 수              </label>
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
                    연간 매출액                  </label>
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
                    보유 인증                  </label>
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
                    보유 특허                  </label>
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
                    누적 투자 유치 금액                  </label>
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
                국가 R&D과제 수행 경험              </label>
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
                  산학연 컨소시엄 연구과제 참여                </label>
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

            {/* Technology Readiness Level (TRL) - Dual-TRL System */}
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-900">기술 성숙도 (TRL) 설정</h4>

              {/* Existing Technology TRL */}
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
                  <option value="9">TRL 9 - 상용화</option>
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

            {/* v5.0: Enhanced Technology & Research Fields Section - Available for ALL organization types */}
            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg">🔬</span>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">기술 및 연구 역량</h4>
                  <p className="text-xs text-gray-600">
                    아래 정보를 입력하면 더 정확한 R&D 과제 매칭을 받을 수 있습니다.
                  </p>
                </div>
              </div>

              {/* Primary Business Domain */}
              <div>
                <label
                  htmlFor="primaryBusinessDomain"
                  className="block text-sm font-medium text-gray-700"
                >
                  주요 사업 영역
                </label>
                <input
                  type="text"
                  id="primaryBusinessDomain"
                  {...register('primaryBusinessDomain')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 바이오의약품 개발, 양자컴퓨팅 솔루션, 스마트양식 시스템, AI 기반 진단기기"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 R&D 과제 공고의 연구 분야와 일치하는 구체적인 사업 영역을 입력하면 매칭 정확도가 향상됩니다.
                </p>
              </div>

              {/* Key Technologies */}
              <div>
                <label
                  htmlFor="keyTechnologies"
                  className="block text-sm font-medium text-gray-700"
                >
                  보유 핵심 기술
                </label>
                <input
                  type="text"
                  id="keyTechnologies"
                  {...register('keyTechnologies')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: AI, 양자센싱, 바이오접합체, 자율주행, 스마트팩토리, 디지털트윈 (쉼표로 구분)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 정부 R&D 공고에서 자주 사용되는 기술 키워드를 입력하세요.
                </p>
                {errors.keyTechnologies && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.keyTechnologies.message}
                  </p>
                )}
              </div>

              {/* Technology Domains Specific */}
              <div>
                <label
                  htmlFor="technologyDomainsSpecific"
                  className="block text-sm font-medium text-gray-700"
                >
                  세부 기술 분야
                </label>
                <input
                  type="text"
                  id="technologyDomainsSpecific"
                  {...register('technologyDomainsSpecific')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 백신개발, 세포치료제, 신약타겟발굴, 양자센싱, 자율주행, 탄소중립기술 (쉼표로 구분)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 정부 R&D 공고에서 자주 등장하는 세부 연구 분야를 입력하세요.
                </p>
              </div>

              {/* Research Focus Areas */}
              <div>
                <label
                  htmlFor="researchFocusAreas"
                  className="block text-sm font-medium text-gray-700"
                >
                  연구 관심 분야
                </label>
                <input
                  type="text"
                  id="researchFocusAreas"
                  {...register('researchFocusAreas')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 첨단바이오, 디지털헬스케어, 미래모빌리티, 기술사업화, 탄소중립 (쉼표로 구분)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  💡 참여하고자 하는 R&D 연구 분야를 입력하세요.
                </p>
                {errors.researchFocusAreas && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.researchFocusAreas.message}
                  </p>
                )}
              </div>
            </div>

            {/* Public Institution specific fields */}
            {organizationType === 'PUBLIC_INSTITUTION' && (
              <>
                {/* Parent Department */}
                <div>
                  <label
                    htmlFor="parentDepartment"
                    className="block text-sm font-medium text-gray-700"
                  >
                    소속 부처/기관                  </label>
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

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                조직 설명              </label>
              <textarea
                id="description"
                {...register('description')}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder={
                  organizationType === 'COMPANY'
                    ? '예: 당사는 AI 기반 의료영상 진단 솔루션을 개발하는 헬스케어 스타트업입니다. 딥러닝 영상처리, 의료 AI, 클라우드 SaaS 기술을 보유하고 있으며, 현재 TRL 6 단계로 파일럿 임상시험을 진행 중입니다. 대학병원 및 연구기관과의 공동연구를 통해 상용화를 목표로 하고 있습니다.'
                    : organizationType === 'RESEARCH_INSTITUTE'
                      ? '예: 본 연구소는 문화유산 디지털화 및 AR/VR 전시기술 연구에 특화된 정부출연연구기관입니다. 3D 스캐닝, 메타버스 콘텐츠 개발, AI 기반 이미지 복원 기술을 보유하고 있으며, TRL 3-4 수준의 원천기술을 기업 기술이전 및 컨소시엄 공동연구를 통해 상용화하고자 합니다.'
                      : organizationType === 'UNIVERSITY'
                        ? '예: 본 연구실은 신소재공학과 소속으로 이차전지 양극재 및 차세대 에너지 저장 소재 연구를 수행하고 있습니다. 나노소재 합성, 전기화학 분석, 배터리 셀 설계 기술을 보유하고 있으며, 기업과의 산학협력을 통해 TRL 1-3 기초연구 결과를 실용화 단계까지 발전시키고자 합니다.'
                        : '예: 본 기관은 과학기술정보통신부 산하 공공기관으로 중소기업 R&D 지원 및 기술사업화를 담당합니다. 기술평가, 사업화 컨설팅, R&D 기획 역량을 보유하고 있으며, 산학연 컨소시엄 구성 및 정부 R&D 과제 기획에 참여하고 있습니다.'
                }
              />
              <p className="mt-1 text-xs text-gray-500">
                💡 조직 설명은 파트너 검색 시 키워드 매칭에 활용됩니다. 주요 연구 분야, 핵심 기술, 협력 희망 분야를 구체적으로 작성해주세요.
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