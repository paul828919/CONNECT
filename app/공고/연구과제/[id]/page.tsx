import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProgram(id: string) {
  const program = await db.funding_programs.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      agencyId: true,
      announcementUrl: true,
      attachmentUrls: true,
      deadline: true,
      applicationStart: true,
      budgetAmount: true,
      fundingPeriod: true,
      minTrl: true,
      maxTrl: true,
      targetType: true,
      requiredCertifications: true,
      preferredCertifications: true,
      requiresResearchInstitute: true,
      eligibilityCriteria: true,
      eligibilityConfidence: true,
      keywords: true,
      category: true,
      primaryTargetIndustry: true,
      technologyDomainsSpecific: true,
    },
  });

  return program;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    return {
      title: '공고를 찾을 수 없습니다 | Connect',
    };
  }

  const eligibilityText = formatEligibilityForMeta(program);
  const deadlineText = program.deadline
    ? `마감: ${program.deadline.toLocaleDateString('ko-KR')}`
    : '';

  return {
    title: `${program.title} | 지원자격·마감일 - Connect`,
    description: `${program.title} 지원 자격: ${eligibilityText}. ${deadlineText}`,
    keywords: [program.title, '연구과제 공고', ...(program.keywords || [])],
    openGraph: {
      title: program.title,
      description: eligibilityText,
      locale: 'ko_KR',
      type: 'article',
    },
    alternates: {
      canonical: `https://connectplt.kr/공고/연구과제/${id}`,
    },
  };
}

function formatEligibilityForMeta(program: any): string {
  const parts: string[] = [];

  if (program.targetType && program.targetType.length > 0) {
    const typeMap: Record<string, string> = {
      COMPANY: '기업',
      RESEARCH_INSTITUTE: '연구기관',
      UNIVERSITY: '대학',
      PUBLIC_INSTITUTION: '공공기관',
    };
    const types = program.targetType.map((t: string) => typeMap[t] || t).join(', ');
    parts.push(types);
  }

  if (program.requiredCertifications && program.requiredCertifications.length > 0) {
    parts.push(`필수인증: ${program.requiredCertifications.join(', ')}`);
  }

  return parts.join(' | ') || '자격요건 확인 필요';
}

function formatBudget(amount: bigint | null): string {
  if (!amount) return '예산 미정';
  const num = Number(amount);
  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toFixed(1)}억원`;
  }
  if (num >= 10_000_000) {
    return `${(num / 10_000_000).toFixed(0)}천만원`;
  }
  return `${(num / 10_000).toFixed(0)}만원`;
}

function formatDate(date: Date | null): string {
  if (!date) return '미정';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getDaysUntil(date: Date | null): number | null {
  if (!date) return null;
  const now = new Date();
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function RDProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    notFound();
  }

  const daysUntilDeadline = getDaysUntil(program.deadline);
  const eligibilityCriteria = program.eligibilityCriteria as Record<string, any> | null;

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: program.title,
    description: program.description || formatEligibilityForMeta(program),
    provider: {
      '@type': 'GovernmentOrganization',
      name: program.agencyId,
    },
    serviceType: 'R&D Funding',
    areaServed: {
      '@type': 'Country',
      name: 'South Korea',
    },
    ...(program.deadline && {
      offers: {
        '@type': 'Offer',
        validThrough: program.deadline.toISOString(),
      },
    }),
  };

  // Organization type mapping
  const typeMap: Record<string, string> = {
    COMPANY: '기업',
    RESEARCH_INSTITUTE: '연구기관',
    UNIVERSITY: '대학',
    PUBLIC_INSTITUTION: '공공기관',
  };

  return (
    <main className="min-h-screen bg-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <section className="py-8 px-4 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/공고" className="hover:text-blue-600">
            공고
          </Link>
          <span className="mx-2">/</span>
          <Link href="/공고/연구과제" className="hover:text-blue-600">
            연구과제
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 truncate">{program.title.slice(0, 30)}...</span>
        </nav>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {program.agencyId}
          </span>
          {daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              D-{daysUntilDeadline}
            </span>
          )}
          {program.eligibilityConfidence === 'HIGH' && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              상세정보 제공
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          {program.title}
        </h1>

        {/* Quick Info */}
        <div className="flex flex-wrap gap-4 text-gray-600">
          <div>
            <span className="text-sm">마감일</span>
            <div className="font-semibold text-gray-900">{formatDate(program.deadline)}</div>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <span className="text-sm">예산</span>
            <div className="font-semibold text-blue-600">{formatBudget(program.budgetAmount)}</div>
          </div>
          {program.fundingPeriod && (
            <div className="border-l border-gray-200 pl-4">
              <span className="text-sm">수행기간</span>
              <div className="font-semibold text-gray-900">{program.fundingPeriod}</div>
            </div>
          )}
        </div>
      </section>

      {/* Key Info Cards */}
      <section className="py-6 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">접수기간</div>
            <div className="font-medium text-gray-900">
              {program.applicationStart ? (
                <>
                  {formatDate(program.applicationStart).replace(/\d{4}년 /, '')} -{' '}
                  {formatDate(program.deadline).replace(/\d{4}년 /, '')}
                </>
              ) : (
                formatDate(program.deadline)
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">지원규모</div>
            <div className="font-medium text-blue-600">{formatBudget(program.budgetAmount)}</div>
          </div>
          {(program.minTrl || program.maxTrl) && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">TRL 범위</div>
              <div className="font-medium text-gray-900">
                TRL {program.minTrl || '?'} - {program.maxTrl || '?'}
              </div>
            </div>
          )}
          {eligibilityCriteria?.numAwards && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">선정 수</div>
              <div className="font-medium text-gray-900">{eligibilityCriteria.numAwards}</div>
            </div>
          )}
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            지원 자격 (누가 지원 가능한가?)
          </h2>

          <div className="space-y-4">
            {/* 신청 가능 기관 */}
            {program.targetType && program.targetType.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">신청 가능 기관:</span>
                  <span className="ml-2 text-gray-700">
                    {program.targetType.map((t) => typeMap[t] || t).join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 필수 인증 */}
            {program.requiredCertifications && program.requiredCertifications.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">필수 인증:</span>
                  <span className="ml-2 text-gray-700">
                    {program.requiredCertifications.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 우대 인증 */}
            {program.preferredCertifications && program.preferredCertifications.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-blue-600 flex-shrink-0">ℹ️</span>
                <div>
                  <span className="font-medium text-gray-900">우대 인증:</span>
                  <span className="ml-2 text-gray-700">
                    {program.preferredCertifications.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 연구소 필수 */}
            {program.requiresResearchInstitute && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">연구소 필수:</span>
                  <span className="ml-2 text-gray-700">예 (기업부설연구소 또는 연구개발전담부서)</span>
                </div>
              </div>
            )}

            {/* Consortium Required */}
            {eligibilityCriteria?.consortiumRequired && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">컨소시엄:</span>
                  <span className="ml-2 text-gray-700">필수 (산학연 공동연구)</span>
                </div>
              </div>
            )}

            {/* Lead/Co Role */}
            {eligibilityCriteria?.leadRoleAllowed && (
              <div className="flex items-start gap-3">
                <span className="text-blue-600 flex-shrink-0">ℹ️</span>
                <div>
                  <span className="font-medium text-gray-900">주관기관 가능:</span>
                  <span className="ml-2 text-gray-700">
                    {Array.isArray(eligibilityCriteria.leadRoleAllowed)
                      ? eligibilityCriteria.leadRoleAllowed.join(', ')
                      : eligibilityCriteria.leadRoleAllowed}
                  </span>
                </div>
              </div>
            )}

            {/* Exclusion Rules */}
            {eligibilityCriteria?.exclusionRules && eligibilityCriteria.exclusionRules.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-orange-600 flex-shrink-0">⚠️</span>
                <div>
                  <span className="font-medium text-gray-900">제외 조건:</span>
                  <span className="ml-2 text-gray-700">
                    {Array.isArray(eligibilityCriteria.exclusionRules)
                      ? eligibilityCriteria.exclusionRules.join(', ')
                      : eligibilityCriteria.exclusionRules}
                  </span>
                </div>
              </div>
            )}

            {/* Confidence Warning */}
            {program.eligibilityConfidence !== 'HIGH' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-600 flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-yellow-800 font-medium">자격요건 확인 필요</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      이 공고의 자격요건 정보가 제한적입니다. 정확한 지원 자격은 원본 공고문을 확인해 주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Info */}
      {eligibilityCriteria?.contactInfo && (
        <section className="py-6 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📞</span>
              문의처
            </h2>
            <p className="text-gray-700">{eligibilityCriteria.contactInfo}</p>
          </div>
        </section>
      )}

      {/* Keywords/Tags */}
      {program.keywords && program.keywords.length > 0 && (
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">관련 키워드</h2>
            <div className="flex flex-wrap gap-2">
              {program.keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 px-4 bg-blue-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            💡 이 과제에 적합한지 확인해보세요
          </h2>
          <p className="text-gray-700 mb-6">
            기업 프로필을 등록하면 AI가 지원 자격과 적합도를 자동으로 분석해 드립니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/signin"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              무료로 적합성 확인하기
            </Link>
            <a
              href={program.announcementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              공식 공고문 보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </section>
    </main>
  );
}
