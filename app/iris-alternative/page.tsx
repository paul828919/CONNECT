import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'IRIS 대안 - 연구자 맞춤 과제 추천 | Connect',
  description:
    'IRIS에서 적합한 연구과제 찾기 어려우셨나요? Connect는 연구자 프로필 기반 AI 매칭으로 딱 맞는 R&D 과제를 추천해 드립니다. 대학, 연구기관, 기업 연구자 모두 이용 가능합니다.',
  keywords: [
    'IRIS',
    'IRIS 대안',
    '연구자정보시스템',
    '연구과제 추천',
    '연구자 매칭',
    'R&D 과제',
    '정부연구과제',
    '대학 연구과제',
    '연구기관 과제',
    'AI 매칭',
  ],
  openGraph: {
    title: 'IRIS 대안 - 연구자 맞춤 과제 추천 | Connect',
    description: '연구자 프로필 기반 AI 매칭으로 딱 맞는 R&D 과제를 추천해 드립니다.',
    locale: 'ko_KR',
    type: 'website',
    url: 'https://connectplt.kr/iris-alternative',
    images: [
      {
        url: 'https://connectplt.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Connect - IRIS 대안 연구자 맞춤 과제 추천',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IRIS 대안 - 연구자 맞춤 과제 추천 | Connect',
    description: '연구자 프로필 기반 AI 매칭으로 딱 맞는 R&D 과제를 추천해 드립니다.',
  },
  alternates: {
    canonical: 'https://connectplt.kr/iris-alternative',
  },
};

async function getProgramStats() {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [totalCount, activeCount, urgentCount] = await Promise.all([
      db.funding_programs.count({
        where: { status: 'ACTIVE' },
      }),
      db.funding_programs.count({
        where: {
          status: 'ACTIVE',
          deadline: { gte: now },
        },
      }),
      db.funding_programs.count({
        where: {
          status: 'ACTIVE',
          deadline: { gte: now, lte: sevenDaysFromNow },
        },
      }),
    ]);
    return { totalCount, activeCount, urgentCount };
  } catch (error) {
    console.error('Failed to fetch program stats:', error);
    return { totalCount: 0, activeCount: 0, urgentCount: 0 };
  }
}

export default async function IrisAlternativePage() {
  const { totalCount, activeCount, urgentCount } = await getProgramStats();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="mb-4">
          <span className="text-sm text-purple-600 font-medium">연구자를 위한</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          IRIS보다 스마트한<br />
          <span className="text-purple-600">연구과제 매칭 서비스</span>
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          연구 분야와 역량에 맞는 과제를 찾느라 시간 낭비하지 마세요.<br />
          AI가 귀하의 연구 프로필을 분석하여 최적의 과제를 추천해 드립니다.
        </p>

        {/* Live Stats */}
        {activeCount > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-purple-900 text-lg">
                  현재{' '}
                  <span className="font-bold text-3xl text-purple-600">
                    {activeCount.toLocaleString()}
                  </span>
                  개 연구과제 공모 중
                </p>
                {urgentCount > 0 && (
                  <p className="text-red-600 text-sm mt-1">
                    ⏰ {urgentCount}건 마감 임박 (7일 이내)
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-600">
                대학 · 연구기관 · 기업 연구자 대상
              </div>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center bg-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            무료로 매칭 받기
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            요금제 보기
          </Link>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-12 px-4 bg-purple-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            이런 분들께 추천합니다
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-purple-100 text-center">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="font-semibold text-gray-900 mb-2">대학 연구자</h3>
              <p className="text-gray-600 text-sm">
                교수, 연구교수, 박사후연구원 등<br />
                대학 소속 연구자
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-purple-100 text-center">
              <div className="text-4xl mb-4">🔬</div>
              <h3 className="font-semibold text-gray-900 mb-2">연구기관 연구원</h3>
              <p className="text-gray-600 text-sm">
                출연연, 국책연구소,<br />
                민간 연구기관 소속
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 border border-purple-100 text-center">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="font-semibold text-gray-900 mb-2">기업 R&D팀</h3>
              <p className="text-gray-600 text-sm">
                중소기업, 벤처, 스타트업<br />
                기업부설연구소
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            기존 시스템의 문제점
          </h2>
          <p className="text-gray-600 mb-8">IRIS, NTIS를 사용하면서 겪는 공통적인 불편함</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                단순 키워드 검색의 한계
              </h3>
              <p className="text-gray-600 text-sm">
                연구 분야 키워드로 검색해도 너무 많은 결과가 나오거나,
                정작 적합한 과제는 다른 키워드로 분류되어 있어 놓치게 됩니다.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                TRL/참여자격 수동 확인
              </h3>
              <p className="text-gray-600 text-sm">
                각 과제의 기술성숙도(TRL) 요구사항, 참여자격 조건을
                일일이 공고문을 열어 확인해야 합니다.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                분산된 공고 정보
              </h3>
              <p className="text-gray-600 text-sm">
                IRIS, NTIS, RCMS, 각 부처 사이트 등
                여러 시스템을 오가며 확인해야 합니다.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="text-red-500 mr-2">✗</span>
                마감일 관리 어려움
              </h3>
              <p className="text-gray-600 text-sm">
                관심 있는 여러 과제의 마감일을 따로 관리해야 하고,
                바쁜 연구 일정 속에서 놓치기 쉽습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connect의 해결 방식
          </h2>
          <p className="text-gray-600 mb-8">연구에 집중하세요, 과제 찾기는 AI가 해드립니다</p>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI 기반 맞춤 매칭</h3>
                <p className="text-gray-600">
                  연구 분야, 보유 기술, 과거 연구 이력 등을 종합 분석하여
                  가장 적합한 과제를 점수화하여 추천합니다.
                  단순 키워드 매칭이 아닌 의미 기반 매칭입니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">자동 적격성 판단</h3>
                <p className="text-gray-600">
                  TRL 요구사항, 기관 유형, 연구자 자격 조건 등을 자동으로 비교하여
                  지원 불가능한 과제는 미리 제외합니다.
                  시간 낭비 없이 지원 가능한 과제만 확인하세요.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-200">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">스마트 마감 알림</h3>
                <p className="text-gray-600">
                  관심 과제를 저장하면 마감 7일/3일/1일 전에 자동으로 알림을 보내드립니다.
                  더 이상 캘린더에 일일이 등록할 필요 없습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            시작하는 방법
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">회원가입</h3>
              <p className="text-gray-600 text-xs">
                카카오/네이버/구글로<br />30초 만에
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">프로필 입력</h3>
              <p className="text-gray-600 text-xs">
                연구 분야, 기관 유형<br />간단 정보 입력
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">매칭 생성</h3>
              <p className="text-gray-600 text-xs">
                AI가 맞춤 과제<br />자동 추천
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">
                4
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">저장 & 알림</h3>
              <p className="text-gray-600 text-xs">
                관심 과제 저장<br />마감 알림 수신
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-12 px-4 bg-purple-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            합리적인 요금제
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-1">무료</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">₩0<span className="text-sm font-normal text-gray-500">/월</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  월 2회 AI 매칭
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  기본 과제 정보 확인
                </li>
              </ul>
              <Link
                href="/auth/signin"
                className="block w-full text-center py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                무료로 시작
              </Link>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-purple-500 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                추천
              </span>
              <h3 className="font-semibold text-gray-900 mb-1">Pro</h3>
              <p className="text-3xl font-bold text-gray-900 mb-4">₩20,900<span className="text-sm font-normal text-gray-500">/월</span></p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  무제한 AI 매칭
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  마감 알림 (D-7, D-3, D-1)
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  AI 상세 분석 리포트
                </li>
              </ul>
              <Link
                href="/pricing"
                className="block w-full text-center py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Pro 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            자주 묻는 질문
          </h2>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-2">
                Connect는 IRIS를 대체하나요?
              </h3>
              <p className="text-gray-600 text-sm">
                아니요, Connect는 IRIS나 NTIS의 데이터를 기반으로 맞춤 매칭을 제공하는 보완 서비스입니다.
                실제 연구과제 신청은 기존 시스템(RCMS, e-R&D 등)에서 진행합니다.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-2">
                개인 연구자도 이용 가능한가요?
              </h3>
              <p className="text-gray-600 text-sm">
                네, 대학 소속 연구자, 연구기관 연구원, 기업 R&D 담당자 모두 이용 가능합니다.
                프로필 설정 시 소속 기관 유형을 선택하시면 됩니다.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-2">
                AI 매칭은 어떻게 작동하나요?
              </h3>
              <p className="text-gray-600 text-sm">
                연구 분야(산업 분류), TRL 수준, 기관 유형, 연구 역량 등을 종합적으로 분석합니다.
                각 과제와의 적합도를 0-100점으로 점수화하여 높은 순으로 추천합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            연구에 집중하세요
          </h2>
          <p className="text-purple-100 mb-8 text-lg">
            적합한 과제 찾기는 AI가 해드립니다.
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
          >
            무료로 시작하기
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="text-purple-200 text-sm mt-4">
            가입 후 바로 AI 매칭 결과 확인 가능
          </p>
        </div>
      </section>
    </main>
  );
}
