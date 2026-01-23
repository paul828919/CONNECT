import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: '중소기업 지원사업 공고 | 정책자금·창업지원 - Connect',
  description:
    '중소벤처24, 정책자금, 창업지원, 수출지원 등 중소기업 지원사업 공고를 확인하세요. AI 매칭으로 우리 기업에 맞는 지원사업을 찾아드립니다.',
  keywords: [
    '중소기업 지원사업',
    '정책자금',
    '창업지원',
    '중소벤처24',
    '정부지원금',
    '소상공인 지원',
  ],
  openGraph: {
    title: '중소기업 지원사업 | Connect',
    description: '중소기업 지원사업 통합 검색 플랫폼',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://connectplt.kr/공고/중소기업지원',
  },
};

async function getPrograms() {
  try {
    const now = new Date();

    const programs = await db.sme_programs.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [{ applicationEnd: { sort: 'asc', nulls: 'last' } }],
      select: {
        id: true,
        title: true,
        supportInstitution: true,
        applicationEnd: true,
        maxSupportAmount: true,
        bizType: true,
        sportType: true,
        targetCompanyScale: true,
        targetRegions: true,
      },
      take: 50,
    });

    return programs.map((p) => ({
      ...p,
      applicationEnd: p.applicationEnd?.toISOString() || null,
      maxSupportAmount: p.maxSupportAmount ? Number(p.maxSupportAmount) : null,
      daysUntilDeadline: p.applicationEnd
        ? Math.ceil((p.applicationEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  } catch (error) {
    console.error('Failed to fetch SME programs:', error);
    return [];
  }
}

function formatSupportAmount(amount: number | null): string {
  if (!amount) return '지원금액 확인필요';
  if (amount >= 100_000_000) {
    return `최대 ${(amount / 100_000_000).toFixed(0)}억원`;
  }
  if (amount >= 10_000_000) {
    return `최대 ${(amount / 10_000_000).toFixed(0)}천만원`;
  }
  return `최대 ${(amount / 10_000).toFixed(0)}만원`;
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return '상시접수';
  const date = new Date(deadline);
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}

function getDeadlineBadge(daysUntil: number | null) {
  if (daysUntil === null) return null;
  if (daysUntil < 0) return { text: '마감됨', class: 'bg-gray-100 text-gray-600' };
  if (daysUntil === 0) return { text: '오늘 마감', class: 'bg-red-100 text-red-800' };
  if (daysUntil <= 3) return { text: `D-${daysUntil}`, class: 'bg-red-100 text-red-800' };
  if (daysUntil <= 7) return { text: `D-${daysUntil}`, class: 'bg-orange-100 text-orange-800' };
  return null;
}

export default async function SMEProgramsListPage() {
  const programs = await getPrograms();

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="py-12 px-4 max-w-4xl mx-auto">
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/공고" className="hover:text-blue-600">
            공고
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">중소기업지원</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          중소기업 지원사업 공고
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          중소벤처24, 정책자금, 창업지원, 수출지원 등 중소기업 지원사업
        </p>

        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-green-600">
            {programs.length}개
          </span>
          <span className="text-gray-600">진행 중인 공고</span>
        </div>
      </section>

      {/* Program List */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto space-y-4">
          {programs.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">현재 진행 중인 공고가 없습니다.</p>
            </div>
          ) : (
            programs.map((program) => {
              const badge = getDeadlineBadge(program.daysUntilDeadline);
              return (
                <Link
                  key={program.id}
                  href={`/공고/중소기업지원/${program.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-green-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">
                          {program.supportInstitution || '중소벤처24'}
                        </span>
                        {badge && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.class}`}
                          >
                            {badge.text}
                          </span>
                        )}
                        {program.bizType && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                            {program.bizType}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {program.title}
                      </h3>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {program.targetCompanyScale &&
                          program.targetCompanyScale.slice(0, 3).map((scale, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {scale}
                            </span>
                          ))}
                        {program.targetRegions &&
                          program.targetRegions.slice(0, 2).map((region, idx) => (
                            <span
                              key={`r-${idx}`}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                            >
                              {region}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Right side info */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-gray-500 mb-1">
                        마감 {formatDeadline(program.applicationEnd)}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatSupportAmount(program.maxSupportAmount)}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            우리 기업에 맞는 지원사업을 찾고 계신가요?
          </h2>
          <p className="text-gray-700 mb-8">
            기업 프로필을 등록하면 AI가 지원 가능한 사업만 추천해 드립니다.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            무료로 AI 매칭 시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
