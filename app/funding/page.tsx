import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: '분야별 정부 R&D 과제 | Connect',
  description:
    'ICT, 바이오, 제조업, 에너지 등 분야별 정부 R&D 지원사업을 한눈에 확인하세요. AI 기반 맞춤 매칭으로 적합한 과제를 추천받으세요.',
  keywords: [
    '정부 R&D',
    '분야별 연구과제',
    'ICT 정부지원',
    '바이오 R&D',
    '제조업 연구과제',
    '에너지 정부과제',
  ],
  openGraph: {
    title: '분야별 정부 R&D 과제 | Connect',
    description: '분야별 정부 R&D 지원사업을 한눈에 확인하세요.',
    locale: 'ko_KR',
    type: 'website',
    url: 'https://connectplt.kr/funding',
  },
  alternates: {
    canonical: 'https://connectplt.kr/funding',
  },
};

const SECTORS = [
  {
    slug: 'ict',
    name: 'ICT/정보통신',
    description: 'AI, 소프트웨어, 데이터, 네트워크, 보안, IoT',
    icon: '💻',
    color: 'blue',
  },
  {
    slug: 'bio-health',
    name: '바이오/헬스',
    description: '의료기기, 의약품, 생명공학, 디지털헬스',
    icon: '🧬',
    color: 'green',
  },
  {
    slug: 'manufacturing',
    name: '제조업',
    description: '스마트공장, 로봇, 소재/부품, 전자/반도체',
    icon: '🏭',
    color: 'gray',
  },
  {
    slug: 'energy',
    name: '에너지',
    description: '신재생에너지, 에너지저장, 스마트그리드',
    icon: '⚡',
    color: 'yellow',
  },
  {
    slug: 'environment',
    name: '환경',
    description: '환경기술, 기후변화, 폐기물처리, 수처리',
    icon: '🌱',
    color: 'emerald',
  },
  {
    slug: 'agriculture',
    name: '농업/식품',
    description: '스마트팜, 식품기술, 농업기계, 축산',
    icon: '🌾',
    color: 'lime',
  },
  {
    slug: 'marine',
    name: '해양/수산',
    description: '해양기술, 수산업, 조선, 해양환경',
    icon: '🌊',
    color: 'cyan',
  },
  {
    slug: 'transportation',
    name: '교통/물류',
    description: '자율주행, 항공, 철도, 물류시스템',
    icon: '🚗',
    color: 'indigo',
  },
  {
    slug: 'construction',
    name: '건설/인프라',
    description: '스마트건설, 건축기술, SOC, 도시개발',
    icon: '🏗️',
    color: 'orange',
  },
  {
    slug: 'defense',
    name: '국방/안보',
    description: '방위산업, 국방기술, 안보',
    icon: '🛡️',
    color: 'slate',
  },
  {
    slug: 'cultural',
    name: '문화/콘텐츠',
    description: '문화기술, 콘텐츠, 미디어, 관광',
    icon: '🎨',
    color: 'pink',
  },
];

async function getTotalStats() {
  try {
    const now = new Date();
    const [totalActive, urgentCount] = await Promise.all([
      db.funding_programs.count({
        where: {
          status: 'ACTIVE',
          deadline: { gte: now },
        },
      }),
      db.funding_programs.count({
        where: {
          status: 'ACTIVE',
          deadline: {
            gte: now,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);
    return { totalActive, urgentCount };
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return { totalActive: 0, urgentCount: 0 };
  }
}

export default async function FundingHubPage() {
  const { totalActive, urgentCount } = await getTotalStats();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            분야별 정부 R&D 과제
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            귀사의 산업 분야에 맞는 정부 R&D 지원사업을 찾아보세요.
          </p>

          {/* Stats */}
          {totalActive > 0 && (
            <div className="inline-flex items-center gap-6 bg-white rounded-xl px-8 py-4 shadow-sm border border-gray-200">
              <div>
                <p className="text-3xl font-bold text-blue-600">{totalActive.toLocaleString()}</p>
                <p className="text-sm text-gray-500">접수 중인 과제</p>
              </div>
              <div className="w-px h-12 bg-gray-200"></div>
              <div>
                <p className="text-3xl font-bold text-red-600">{urgentCount}</p>
                <p className="text-sm text-gray-500">마감 임박 (7일)</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sectors Grid */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            산업 분야 선택
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECTORS.map((sector) => (
              <Link
                key={sector.slug}
                href={`/funding/${sector.slug}`}
                className="group p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{sector.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {sector.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {sector.description}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  과제 보기
                  <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Alternative Search Methods */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            다른 방법으로 찾기
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/ntis-alternative"
              className="p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">NTIS 사용자를 위한</h3>
              <p className="text-gray-600 text-sm">
                NTIS에서 찾기 어려우셨나요? AI가 맞춤 과제를 추천해 드립니다.
              </p>
            </Link>

            <Link
              href="/iris-alternative"
              className="p-6 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-gray-900 mb-2">연구자를 위한</h3>
              <p className="text-gray-600 text-sm">
                연구 분야와 역량에 맞는 과제를 AI가 찾아드립니다.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            어떤 분야인지 모르겠다면?
          </h2>
          <p className="text-gray-600 mb-8">
            회사 프로필만 입력하면 AI가 적합한 과제를 자동으로 찾아드립니다.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            무료로 AI 매칭 받기
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
