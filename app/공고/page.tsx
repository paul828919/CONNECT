import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: '공고 | 정부 R&D·중소기업 지원사업 통합 검색 - Connect',
  description:
    '정부 R&D 연구과제, 중소기업 지원사업 공고를 한 곳에서 확인하세요. AI 매칭으로 우리 기업에 맞는 지원사업을 찾아드립니다.',
  keywords: [
    '정부 공고',
    '연구과제 공고',
    'R&D 지원사업',
    '중소기업 지원',
    '정부지원금',
    'NTIS',
    '중소벤처24',
  ],
  openGraph: {
    title: '공고 | Connect',
    description: '정부 R&D·중소기업 지원사업 통합 검색 플랫폼',
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: 'https://connectplt.kr/공고',
  },
};

async function getStats() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [rdCount, rdUrgent, smeCount, smeUrgent] = await Promise.all([
      db.funding_programs.count({
        where: { status: 'ACTIVE' },
      }),
      db.funding_programs.count({
        where: {
          status: 'ACTIVE',
          deadline: { lte: sevenDaysFromNow, gte: now },
        },
      }),
      db.sme_programs.count({
        where: { status: 'ACTIVE' },
      }),
      db.sme_programs.count({
        where: {
          status: 'ACTIVE',
          applicationEnd: { lte: sevenDaysFromNow, gte: now },
        },
      }),
    ]);

    return { rdCount, rdUrgent, smeCount, smeUrgent };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return { rdCount: 0, rdUrgent: 0, smeCount: 0, smeUrgent: 0 };
  }
}

export default async function AnnouncementsHubPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          정부 지원사업 공고
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          정부 R&D 연구과제와 중소기업 지원사업 공고를 한 곳에서 확인하세요.
          AI가 우리 기업에 맞는 지원사업을 찾아드립니다.
        </p>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* R&D 연구과제 */}
          <Link
            href="/공고/연구과제"
            className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔬</span>
              <h2 className="text-xl font-bold text-blue-900">R&D 연구과제</h2>
            </div>
            <p className="text-blue-800 mb-4">
              NTIS, KEIT, IITP, TIPA, KIMST 등 정부 R&D 지원사업
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-blue-600">
                {stats.rdCount.toLocaleString()}
              </span>
              <span className="text-blue-700">개 공고</span>
              {stats.rdUrgent > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                  마감 임박 {stats.rdUrgent}건
                </span>
              )}
            </div>
          </Link>

          {/* 중소기업 지원 */}
          <Link
            href="/공고/중소기업지원"
            className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🏢</span>
              <h2 className="text-xl font-bold text-green-900">중소기업 지원사업</h2>
            </div>
            <p className="text-green-800 mb-4">
              중소벤처24, 정책자금, 창업지원, 수출지원 등
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">
                {stats.smeCount.toLocaleString()}
              </span>
              <span className="text-green-700">개 공고</span>
              {stats.smeUrgent > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                  마감 임박 {stats.smeUrgent}건
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/auth/signin"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            무료로 AI 매칭 시작하기
          </Link>
          <p className="mt-4 text-gray-600 text-sm">
            기업 프로필 기반 맞춤 추천 • 마감 알림 • 지원 자격 자동 확인
          </p>
        </div>
      </section>

      {/* Why Use Connect */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Connect를 사용해야 하는 이유
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl mb-3">🎯</div>
              <h3 className="font-bold text-gray-900 mb-2">AI 맞춤 매칭</h3>
              <p className="text-gray-600 text-sm">
                기업 프로필 기반으로 지원 가능한 공고만 추천
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl mb-3">⏰</div>
              <h3 className="font-bold text-gray-900 mb-2">마감 알림</h3>
              <p className="text-gray-600 text-sm">
                7일, 3일, 1일 전 이메일 알림으로 기회를 놓치지 않음
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl mb-3">✅</div>
              <h3 className="font-bold text-gray-900 mb-2">자격 자동 확인</h3>
              <p className="text-gray-600 text-sm">
                매출, 인증, 업력 등 자격 요건 자동 필터링
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">자주 묻는 질문</h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                R&D 연구과제와 중소기업 지원사업의 차이점은?
              </h3>
              <p className="text-gray-700">
                R&D 연구과제는 기술 개발을 위한 연구비 지원 (NTIS, KEIT 등)이고,
                중소기업 지원사업은 정책자금, 창업지원, 수출지원 등 경영 전반을
                지원합니다 (중소벤처24).
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                어떤 기업이 지원할 수 있나요?
              </h3>
              <p className="text-gray-700">
                공고마다 지원 자격이 다릅니다. 일반적으로 중소기업, 스타트업, 연구기관,
                대학 등이 지원 가능하며, 매출액, 업력, 인증 보유 여부 등 세부 요건이
                있습니다.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                공고 정보는 얼마나 자주 업데이트되나요?
              </h3>
              <p className="text-gray-700">
                매일 자동으로 NTIS, 중소벤처24 등 공공 데이터 포털을 확인하여 새로운
                공고를 업데이트합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 text-center bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">
            지금 바로 우리 기업에 맞는 지원사업을 찾아보세요
          </h2>
          <p className="text-blue-100 mb-8">
            무료 가입 후 기업 프로필을 등록하면 AI가 맞춤 공고를 추천해 드립니다.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
