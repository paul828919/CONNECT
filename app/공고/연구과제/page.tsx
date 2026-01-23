import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: '연구과제 공고 | 정부 R&D 지원사업 - Connect',
  description:
    'NTIS, KEIT, IITP, TIPA, KIMST 등 정부 R&D 연구과제 공고를 확인하세요. AI 매칭으로 우리 기업에 맞는 연구과제를 찾아드립니다.',
  keywords: [
    '연구과제 공고',
    '정부과제',
    'R&D 지원사업',
    '국가연구개발사업',
    'NTIS',
    'KEIT',
    'IITP',
  ],
  openGraph: {
    title: '연구과제 공고 | Connect',
    description: '정부 R&D 연구과제 통합 검색 플랫폼',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://connectplt.kr/공고/연구과제',
  },
};

async function getPrograms() {
  try {
    const now = new Date();

    const programs = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        announcementType: 'R_D_PROJECT',
      },
      orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }],
      select: {
        id: true,
        title: true,
        agencyId: true,
        deadline: true,
        budgetAmount: true,
        eligibilityConfidence: true,
        keywords: true,
        category: true,
      },
      take: 50,
    });

    return programs.map((p) => ({
      ...p,
      deadline: p.deadline?.toISOString() || null,
      budgetAmount: p.budgetAmount ? Number(p.budgetAmount) : null,
      daysUntilDeadline: p.deadline
        ? Math.ceil((p.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));
  } catch (error) {
    console.error('Failed to fetch programs:', error);
    return [];
  }
}

function formatBudget(amount: number | null): string {
  if (!amount) return '예산 미정';
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억원`;
  }
  if (amount >= 10_000_000) {
    return `${(amount / 10_000_000).toFixed(0)}천만원`;
  }
  return `${(amount / 10_000).toFixed(0)}만원`;
}

function formatDeadline(deadline: string | null, daysUntil: number | null): string {
  if (!deadline) return '마감일 미정';
  const date = new Date(deadline);
  const formatted = date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
  return formatted;
}

function getDeadlineBadge(daysUntil: number | null) {
  if (daysUntil === null) return null;
  if (daysUntil < 0) return { text: '마감됨', class: 'bg-gray-100 text-gray-600' };
  if (daysUntil === 0) return { text: '오늘 마감', class: 'bg-red-100 text-red-800' };
  if (daysUntil <= 3) return { text: `D-${daysUntil}`, class: 'bg-red-100 text-red-800' };
  if (daysUntil <= 7) return { text: `D-${daysUntil}`, class: 'bg-orange-100 text-orange-800' };
  return null;
}

export default async function RDProgramsListPage() {
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
          <span className="text-gray-900">연구과제</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          R&D 연구과제 공고
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          NTIS, KEIT, IITP, TIPA, KIMST 등 정부 R&D 지원사업 공고
        </p>

        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-blue-600">
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
                  href={`/공고/연구과제/${program.id}`}
                  className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title and Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">
                          {program.agencyId}
                        </span>
                        {badge && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.class}`}
                          >
                            {badge.text}
                          </span>
                        )}
                        {program.eligibilityConfidence === 'HIGH' && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                            상세정보
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {program.title}
                      </h3>

                      {/* Tags */}
                      {program.keywords && program.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {program.keywords.slice(0, 4).map((keyword, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right side info */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm text-gray-500 mb-1">
                        마감 {formatDeadline(program.deadline, program.daysUntilDeadline)}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatBudget(program.budgetAmount)}
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
            우리 기업에 맞는 연구과제를 찾고 계신가요?
          </h2>
          <p className="text-gray-700 mb-8">
            기업 프로필을 등록하면 AI가 지원 가능한 연구과제만 추천해 드립니다.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            무료로 AI 매칭 시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
