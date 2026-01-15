import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { INDUSTRY_TAXONOMY, findIndustrySector } from '@/lib/matching/taxonomy';

/**
 * Sector configuration with SEO metadata
 */
const SECTOR_CONFIG: Record<string, {
  name: string;
  description: string;
  keywords: string[];
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  ict: {
    name: 'ICT/정보통신',
    description: 'AI, 소프트웨어, 데이터, 네트워크, 보안, IoT 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['ICT R&D', '정보통신 연구과제', 'AI 정부지원', '소프트웨어 개발 과제', '디지털 전환'],
    icon: '💻',
    color: 'blue',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  manufacturing: {
    name: '제조업',
    description: '스마트공장, 로봇, 소재/부품, 전자/반도체, 기계 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['제조업 R&D', '스마트공장 지원사업', '소재부품 연구과제', '반도체 정부지원'],
    icon: '🏭',
    color: 'gray',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  'bio-health': {
    name: '바이오/헬스',
    description: '의료기기, 의약품, 생명공학, 디지털헬스 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['바이오 R&D', '의료기기 정부지원', '신약개발 과제', '헬스케어 연구'],
    icon: '🧬',
    color: 'green',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  energy: {
    name: '에너지',
    description: '신재생에너지, 에너지저장, 스마트그리드, 원자력 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['에너지 R&D', '신재생에너지 지원', '태양광 연구과제', '수소에너지'],
    icon: '⚡',
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  environment: {
    name: '환경',
    description: '환경기술, 기후변화, 폐기물처리, 수처리 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['환경 R&D', '기후변화 대응', '탄소중립 과제', '환경기술 지원'],
    icon: '🌱',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  agriculture: {
    name: '농업/식품',
    description: '스마트팜, 식품기술, 농업기계, 축산 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['농업 R&D', '스마트팜 지원', '식품기술 연구', '농림 정부과제'],
    icon: '🌾',
    color: 'lime',
    bgColor: 'bg-lime-50',
    borderColor: 'border-lime-200',
  },
  marine: {
    name: '해양/수산',
    description: '해양기술, 수산업, 조선, 해양환경 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['해양 R&D', '수산업 지원', '조선 연구과제', '해양환경'],
    icon: '🌊',
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
  },
  construction: {
    name: '건설/인프라',
    description: '스마트건설, 건축기술, SOC, 도시개발 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['건설 R&D', '스마트건설', '건축기술 지원', '인프라 연구'],
    icon: '🏗️',
    color: 'orange',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  transportation: {
    name: '교통/물류',
    description: '자율주행, 항공, 철도, 물류시스템 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['교통 R&D', '자율주행 지원', '항공 연구과제', '물류기술'],
    icon: '🚗',
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  defense: {
    name: '국방/안보',
    description: '방위산업, 국방기술, 안보 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['국방 R&D', '방위산업 지원', '국방기술 연구'],
    icon: '🛡️',
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  cultural: {
    name: '문화/콘텐츠',
    description: '문화기술, 콘텐츠, 미디어, 관광 분야의 정부 R&D 과제를 찾아보세요.',
    keywords: ['문화 R&D', '콘텐츠 지원', '미디어 기술', '문화산업'],
    icon: '🎨',
    color: 'pink',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
};

// Map URL slugs to taxonomy keys
const SLUG_TO_TAXONOMY: Record<string, string> = {
  'ict': 'ICT',
  'manufacturing': 'MANUFACTURING',
  'bio-health': 'BIO_HEALTH',
  'energy': 'ENERGY',
  'environment': 'ENVIRONMENT',
  'agriculture': 'AGRICULTURE',
  'marine': 'MARINE',
  'construction': 'CONSTRUCTION',
  'transportation': 'TRANSPORTATION',
  'defense': 'DEFENSE',
  'cultural': 'CULTURAL',
};

type Props = {
  params: Promise<{ sector: string }>;
};

export async function generateStaticParams() {
  return Object.keys(SECTOR_CONFIG).map((sector) => ({
    sector,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  const config = SECTOR_CONFIG[sector];

  if (!config) {
    return {
      title: '페이지를 찾을 수 없습니다 | Connect',
    };
  }

  return {
    title: `${config.name} 분야 정부 R&D 과제 | Connect`,
    description: config.description,
    keywords: config.keywords,
    openGraph: {
      title: `${config.name} 분야 정부 R&D 과제 | Connect`,
      description: config.description,
      locale: 'ko_KR',
      type: 'website',
      url: `https://connectplt.kr/funding/${sector}`,
    },
    alternates: {
      canonical: `https://connectplt.kr/funding/${sector}`,
    },
  };
}

async function getSectorStats(taxonomyKey: string) {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get all active programs
    const allPrograms = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        deadline: { gte: now },
      },
      select: {
        id: true,
        title: true,
        keywords: true,
        category: true,
        deadline: true,
        agencyId: true,
        budgetAmount: true,
      },
    });

    // Filter programs matching this sector
    const sectorPrograms = allPrograms.filter(program => {
      // Check keywords
      for (const keyword of program.keywords) {
        const foundSector = findIndustrySector(keyword);
        if (foundSector === taxonomyKey) return true;
      }
      // Check title words
      const titleWords = program.title.split(/[\s,.\-\/()]+/);
      for (const word of titleWords) {
        const foundSector = findIndustrySector(word);
        if (foundSector === taxonomyKey) return true;
      }
      // Check category
      if (program.category) {
        const foundSector = findIndustrySector(program.category);
        if (foundSector === taxonomyKey) return true;
      }
      return false;
    });

    const urgentCount = sectorPrograms.filter(
      p => p.deadline && new Date(p.deadline) <= sevenDaysFromNow
    ).length;

    // Get top 5 programs by deadline (soonest first)
    const topPrograms = sectorPrograms
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      })
      .slice(0, 5);

    return {
      totalCount: sectorPrograms.length,
      urgentCount,
      topPrograms,
    };
  } catch (error) {
    console.error('Failed to fetch sector stats:', error);
    return { totalCount: 0, urgentCount: 0, topPrograms: [] };
  }
}

export default async function SectorPage({ params }: Props) {
  const { sector } = await params;
  const config = SECTOR_CONFIG[sector];
  const taxonomyKey = SLUG_TO_TAXONOMY[sector];

  if (!config || !taxonomyKey) {
    notFound();
  }

  const { totalCount, urgentCount, topPrograms } = await getSectorStats(taxonomyKey);
  const taxonomyData = INDUSTRY_TAXONOMY[taxonomyKey as keyof typeof INDUSTRY_TAXONOMY];
  const subSectors = taxonomyData?.subSectors ? Object.values(taxonomyData.subSectors) : [];

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className={`py-16 px-4 ${config.bgColor}`}>
        <div className="max-w-4xl mx-auto">
          <div className="text-6xl mb-4">{config.icon}</div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {config.name} 분야<br />
            <span className="text-gray-600">정부 R&D 과제</span>
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            {config.description}
          </p>

          {/* Live Stats */}
          {totalCount > 0 && (
            <div className={`bg-white border ${config.borderColor} rounded-xl p-6 mb-8`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-gray-900 text-lg">
                    현재{' '}
                    <span className="font-bold text-3xl text-blue-600">
                      {totalCount.toLocaleString()}
                    </span>
                    개 과제 접수 중
                  </p>
                  {urgentCount > 0 && (
                    <p className="text-red-600 text-sm mt-1">
                      ⏰ {urgentCount}건 마감 임박 (7일 이내)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              무료로 매칭 받기
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center border border-gray-300 bg-white text-gray-700 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              요금제 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Sub-sectors */}
      {subSectors.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              세부 분야
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {subSectors.map((sub: { name: string; keywords: string[] }, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}
                >
                  <h3 className="font-semibold text-gray-900">{sub.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {sub.keywords.slice(0, 3).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Current Programs Preview */}
      {topPrograms.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              현재 접수 중인 과제
            </h2>
            <p className="text-gray-600 mb-6">마감일이 가까운 순으로 표시됩니다</p>

            <div className="space-y-4">
              {topPrograms.map((program) => {
                const daysUntilDeadline = program.deadline
                  ? Math.ceil((new Date(program.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <div
                    key={program.id}
                    className="bg-white rounded-lg border border-gray-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {program.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">
                            {program.agencyId}
                          </span>
                          {program.budgetAmount && (
                            <span>
                              {(Number(program.budgetAmount) / 100000000).toFixed(0)}억원
                            </span>
                          )}
                        </div>
                      </div>
                      {daysUntilDeadline !== null && (
                        <div className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
                          daysUntilDeadline <= 3
                            ? 'bg-red-100 text-red-700'
                            : daysUntilDeadline <= 7
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          D-{daysUntilDeadline}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/auth/signin"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                전체 과제 보기 →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How Connect Helps */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Connect가 도와드립니다
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🎯
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI 맞춤 매칭</h3>
              <p className="text-gray-600 text-sm">
                회사 프로필을 기반으로<br />
                적합한 과제를 자동 추천
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">실시간 업데이트</h3>
              <p className="text-gray-600 text-sm">
                새로운 공고가 올라오면<br />
                바로 매칭 대상에 포함
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
                🔔
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">마감 알림</h3>
              <p className="text-gray-600 text-sm">
                D-7, D-3, D-1<br />
                자동 이메일 알림
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other Sectors */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            다른 분야 둘러보기
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(SECTOR_CONFIG)
              .filter(([key]) => key !== sector)
              .slice(0, 8)
              .map(([key, cfg]) => (
                <Link
                  key={key}
                  href={`/funding/${key}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl">{cfg.icon}</span>
                  <span className="font-medium text-gray-900 text-sm">{cfg.name}</span>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {config.name} 분야 R&D 과제를 찾고 계신가요?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            AI가 귀사에 맞는 과제를 찾아드립니다.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            무료로 시작하기
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
