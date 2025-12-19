import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: '연구과제 공고 | 정부 R&D 지원사업 통합 검색 - Connect',
  description:
    'NTIS, KEIT, IITP, TIPA 등 정부 연구과제 공고를 한 곳에서 검색하세요. AI 매칭으로 우리 기업에 맞는 R&D 지원사업을 찾아드립니다.',
  keywords: [
    '연구과제 공고',
    '정부과제',
    'R&D 지원사업',
    '국가연구개발사업',
    'NTIS',
    '중소기업 R&D',
  ],
  openGraph: {
    title: '연구과제 공고 | Connect',
    description: '정부 R&D 지원사업 통합 검색 플랫폼',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://connectplt.kr/seo/research-grants',
  },
};

async function getProgramStats() {
  try {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [totalCount, urgentCount] = await Promise.all([
      db.funding_programs.count({
        where: { status: 'ACTIVE' },
      }),
      db.funding_programs.count({
        where: {
          status: 'ACTIVE',
          deadline: {
            lte: sevenDaysFromNow,
            gte: now,
          },
        },
      }),
    ]);
    return { totalCount, urgentCount };
  } catch (error) {
    console.error('Failed to fetch program stats:', error);
    return { totalCount: 0, urgentCount: 0 };
  }
}

export default async function ResearchGrantsPage() {
  const { totalCount, urgentCount } = await getProgramStats();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          연구과제 공고
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          정부 R&D 지원사업 공고를 한 곳에서 검색하고, AI 매칭으로 우리 기업에
          딱 맞는 연구과제를 찾아보세요.
        </p>

        {/* Live Stats */}
        {totalCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <p className="text-blue-900 text-lg">
              현재{' '}
              <span className="font-bold text-2xl">
                {totalCount.toLocaleString()}
              </span>
              개 연구과제 공고 중
              {urgentCount > 0 && (
                <span className="ml-2 text-red-600">
                  (마감 임박 {urgentCount}건)
                </span>
              )}
            </p>
          </div>
        )}

        {/* CTA */}
        <Link
          href="/auth/signin"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* Pain Points Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            기존 연구과제 검색의 문제점
          </h2>

          <div className="space-y-4 text-gray-700">
            <p>
              NTIS, KEIT, IITP, TIPA, KIMST 등 각 부처별 공고 사이트를 일일이
              확인해야 합니다.
            </p>
            <p>
              공고마다 지원 자격, 신청 기간, 지원 규모가 다르고, 우리 기업에 맞는
              과제를 찾기 어렵습니다.
            </p>
            <p>
              마감일을 놓치면 1년을 기다려야 하는 경우도 많습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Connect가 해결합니다
          </h2>

          <div className="space-y-4 text-gray-700">
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>모든 정부 R&D 공고를 한 곳에서 통합 검색</span>
            </p>
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>AI가 기업 프로필 기반으로 맞춤 과제 추천</span>
            </p>
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>마감 임박 알림으로 기회를 놓치지 않음</span>
            </p>
            <p className="flex items-start">
              <span className="text-blue-600 mr-3 flex-shrink-0">✓</span>
              <span>지원 자격 자동 필터링으로 시간 절약</span>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            자주 묻는 질문
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Connect는 무료인가요?
              </h3>
              <p className="text-gray-700">
                기본 검색과 공고 확인은 무료입니다. AI 매칭과 알림 기능은 유료
                플랜에서 제공됩니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                어떤 기관의 공고가 포함되나요?
              </h3>
              <p className="text-gray-700">
                NTIS, KEIT, IITP, TIPA, KIMST 등 주요 정부 R&D 지원기관의 공고를
                통합하여 제공합니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                공고 정보는 얼마나 자주 업데이트되나요?
              </h3>
              <p className="text-gray-700">
                매일 자동으로 각 기관 사이트를 확인하여 새로운 공고를
                업데이트합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-700 mb-8">
            우리 기업에 맞는 정부 R&D 지원사업을 찾아보세요.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
