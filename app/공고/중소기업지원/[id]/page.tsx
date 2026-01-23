import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProgram(id: string) {
  const program = await db.sme_programs.findUnique({
    where: { id },
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
  const deadlineText = program.applicationEnd
    ? `마감: ${program.applicationEnd.toLocaleDateString('ko-KR')}`
    : '상시접수';

  return {
    title: `${program.title} | 지원자격·마감일 - Connect`,
    description: `${program.title} 지원 자격: ${eligibilityText}. ${deadlineText}`,
    keywords: [program.title, '중소기업 지원사업', program.bizType || '', program.supportInstitution || ''].filter(Boolean),
    openGraph: {
      title: program.title,
      description: eligibilityText,
      locale: 'ko_KR',
      type: 'article',
    },
    alternates: {
      canonical: `https://connectplt.kr/공고/중소기업지원/${id}`,
    },
  };
}

function formatEligibilityForMeta(program: any): string {
  const parts: string[] = [];

  if (program.targetCompanyScale && program.targetCompanyScale.length > 0) {
    parts.push(program.targetCompanyScale.join(', '));
  }

  if (program.targetRegions && program.targetRegions.length > 0) {
    parts.push(`지역: ${program.targetRegions.slice(0, 3).join(', ')}`);
  }

  if (program.requiredCerts && program.requiredCerts.length > 0) {
    parts.push(`필수인증: ${program.requiredCerts.join(', ')}`);
  }

  return parts.join(' | ') || '자격요건 확인 필요';
}

function formatSupportAmount(amount: bigint | null): string {
  if (!amount) return '지원금액 확인필요';
  const num = Number(amount);
  if (num >= 100_000_000) {
    return `${(num / 100_000_000).toFixed(0)}억원`;
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

export default async function SMEProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const program = await getProgram(id);

  if (!program) {
    notFound();
  }

  const daysUntilDeadline = getDaysUntil(program.applicationEnd);

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: program.title,
    description: program.description || program.supportContents || formatEligibilityForMeta(program),
    provider: {
      '@type': 'GovernmentOrganization',
      name: program.supportInstitution || '중소벤처기업부',
    },
    serviceType: 'SME Support',
    areaServed: {
      '@type': 'Country',
      name: 'South Korea',
    },
    ...(program.applicationEnd && {
      offers: {
        '@type': 'Offer',
        validThrough: program.applicationEnd.toISOString(),
      },
    }),
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
          <Link href="/공고/중소기업지원" className="hover:text-blue-600">
            중소기업지원
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 truncate">{program.title.slice(0, 30)}...</span>
        </nav>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {program.supportInstitution || '중소벤처24'}
          </span>
          {program.bizType && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {program.bizType}
            </span>
          )}
          {daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && (
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
              D-{daysUntilDeadline}
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
            <span className="text-sm">접수마감</span>
            <div className="font-semibold text-gray-900">
              {program.applicationEnd ? formatDate(program.applicationEnd) : '상시접수'}
            </div>
          </div>
          {program.maxSupportAmount && (
            <div className="border-l border-gray-200 pl-4">
              <span className="text-sm">최대 지원금액</span>
              <div className="font-semibold text-green-600">
                {formatSupportAmount(program.maxSupportAmount)}
              </div>
            </div>
          )}
          {program.sportType && (
            <div className="border-l border-gray-200 pl-4">
              <span className="text-sm">지원유형</span>
              <div className="font-semibold text-gray-900">{program.sportType}</div>
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
              {program.applicationStart && program.applicationEnd ? (
                <>
                  {formatDate(program.applicationStart).replace(/\d{4}년 /, '')} -{' '}
                  {formatDate(program.applicationEnd).replace(/\d{4}년 /, '')}
                </>
              ) : program.applicationEnd ? (
                `~ ${formatDate(program.applicationEnd)}`
              ) : (
                '상시접수'
              )}
            </div>
          </div>
          {program.maxSupportAmount && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">최대 지원금</div>
              <div className="font-medium text-green-600">
                {formatSupportAmount(program.maxSupportAmount)}
              </div>
            </div>
          )}
          {program.maxInterestRate && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">금리</div>
              <div className="font-medium text-gray-900">
                {program.minInterestRate
                  ? `${program.minInterestRate}% ~ ${program.maxInterestRate}%`
                  : `최대 ${program.maxInterestRate}%`}
              </div>
            </div>
          )}
          {program.lifeCycle && program.lifeCycle.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">생애주기</div>
              <div className="font-medium text-gray-900">
                {program.lifeCycle.join(', ')}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Description */}
      {(program.description || program.supportContents) && (
        <section className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">사업 개요</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 whitespace-pre-line">
                {program.description || program.supportContents}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Support Details */}
      {program.supportScale && (
        <section className="py-6 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">지원 규모</h2>
            <p className="text-gray-700 whitespace-pre-line">{program.supportScale}</p>
          </div>
        </section>
      )}

      {/* Eligibility Section */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            지원 자격 (누가 지원 가능한가?)
          </h2>

          <div className="space-y-4">
            {/* 대상 기업 규모 */}
            {program.targetCompanyScale && program.targetCompanyScale.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">대상 기업 규모:</span>
                  <span className="ml-2 text-gray-700">
                    {program.targetCompanyScale.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 매출액 조건 */}
            {program.targetSalesRange && program.targetSalesRange.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">매출액:</span>
                  <span className="ml-2 text-gray-700">
                    {program.targetSalesRange.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 종업원 수 */}
            {program.targetEmployeeRange && program.targetEmployeeRange.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">종업원 수:</span>
                  <span className="ml-2 text-gray-700">
                    {program.targetEmployeeRange.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 업력 조건 */}
            {program.targetBusinessAge && program.targetBusinessAge.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">업력:</span>
                  <span className="ml-2 text-gray-700">
                    {program.targetBusinessAge.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 지역 */}
            {program.targetRegions && program.targetRegions.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-blue-600 flex-shrink-0">📍</span>
                <div>
                  <span className="font-medium text-gray-900">대상 지역:</span>
                  <span className="ml-2 text-gray-700">
                    {program.targetRegions.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 필수 인증 */}
            {program.requiredCerts && program.requiredCerts.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-green-600 flex-shrink-0">✅</span>
                <div>
                  <span className="font-medium text-gray-900">필수 인증:</span>
                  <span className="ml-2 text-gray-700">
                    {program.requiredCerts.join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 대표자 연령 */}
            {program.targetCeoAge && (
              <div className="flex items-start gap-3">
                <span className="text-blue-600 flex-shrink-0">ℹ️</span>
                <div>
                  <span className="font-medium text-gray-900">대표자 연령:</span>
                  <span className="ml-2 text-gray-700">
                    {program.minCeoAge && program.maxCeoAge
                      ? `${program.minCeoAge}세 ~ ${program.maxCeoAge}세`
                      : `${program.targetCeoAge}세`}
                  </span>
                </div>
              </div>
            )}

            {/* 특수 조건 */}
            {(program.isRestart || program.isPreStartup || program.isFemaleOwner) && (
              <div className="flex items-start gap-3">
                <span className="text-purple-600 flex-shrink-0">⭐</span>
                <div>
                  <span className="font-medium text-gray-900">우대 대상:</span>
                  <span className="ml-2 text-gray-700">
                    {[
                      program.isRestart && '재창업자',
                      program.isPreStartup && '예비창업자',
                      program.isFemaleOwner && '여성대표자',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              </div>
            )}

            {/* 지원 대상 원문 */}
            {program.supportTarget && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">상세 지원대상</h3>
                <p className="text-gray-700 text-sm whitespace-pre-line">
                  {program.supportTarget}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Application Method */}
      {program.applicationMethod && (
        <section className="py-6 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📝</span>
              신청 방법
            </h2>
            <p className="text-gray-700 whitespace-pre-line">{program.applicationMethod}</p>
          </div>
        </section>
      )}

      {/* Contact Info */}
      {program.contactInfo && (
        <section className="py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">📞</span>
              문의처
            </h2>
            <p className="text-gray-700">{program.contactInfo}</p>
            {program.contactTel && (
              <p className="text-gray-700 mt-2">
                <span className="font-medium">전화:</span> {program.contactTel}
              </p>
            )}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 px-4 bg-green-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            💡 이 사업에 지원 가능한지 확인해보세요
          </h2>
          <p className="text-gray-700 mb-6">
            기업 프로필을 등록하면 AI가 지원 자격과 적합도를 자동으로 분석해 드립니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/signin"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              무료로 적합성 확인하기
            </Link>
            {program.detailUrl && (
              <a
                href={program.detailUrl}
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
            )}
            {program.applicationUrl && (
              <a
                href={program.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                온라인 신청하기
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
