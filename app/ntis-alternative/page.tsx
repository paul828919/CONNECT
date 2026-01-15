import { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';

export const metadata: Metadata = {
  title: 'NTIS 대안 - 맞춤형 정부과제 매칭 | Connect',
  description:
    'NTIS에서 연구과제 찾기 어려우셨나요? Connect는 AI 기반 맞춤 매칭으로 귀사에 딱 맞는 R&D 지원사업을 추천해 드립니다. 무료로 시작하세요.',
  keywords: [
    'NTIS',
    'NTIS 대안',
    '국가과학기술정보서비스',
    '정부과제 매칭',
    'R&D 과제 추천',
    '연구과제 검색',
    '정부지원사업',
    '중소기업 R&D',
    'AI 매칭',
  ],
  openGraph: {
    title: 'NTIS 대안 - 맞춤형 정부과제 매칭 | Connect',
    description: 'AI 기반 맞춤 매칭으로 귀사에 딱 맞는 R&D 지원사업을 추천해 드립니다.',
    locale: 'ko_KR',
    type: 'website',
    url: 'https://connectplt.kr/ntis-alternative',
    images: [
      {
        url: 'https://connectplt.kr/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Connect - NTIS 대안 맞춤형 정부과제 매칭',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NTIS 대안 - 맞춤형 정부과제 매칭 | Connect',
    description: 'AI 기반 맞춤 매칭으로 귀사에 딱 맞는 R&D 지원사업을 추천해 드립니다.',
  },
  alternates: {
    canonical: 'https://connectplt.kr/ntis-alternative',
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

export default async function NtisAlternativePage() {
  const { totalCount, activeCount, urgentCount } = await getProgramStats();

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="py-16 px-4 max-w-4xl mx-auto">
        <div className="mb-4">
          <span className="text-sm text-blue-600 font-medium">NTIS 사용자를 위한</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
          NTIS보다 쉽고 빠른<br />
          <span className="text-blue-600">맞춤형 정부과제 매칭</span>
        </h1>

        <p className="text-lg text-gray-700 mb-8 leading-relaxed">
          NTIS에서 수백 개의 공고를 일일이 확인하는 대신,<br />
          AI가 귀사에 맞는 R&D 과제를 자동으로 추천해 드립니다.
        </p>

        {/* Live Stats */}
        {activeCount > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-blue-900 text-lg">
                  현재{' '}
                  <span className="font-bold text-3xl text-blue-600">
                    {activeCount.toLocaleString()}
                  </span>
                  개 과제 접수 중
                </p>
                {urgentCount > 0 && (
                  <p className="text-red-600 text-sm mt-1">
                    ⏰ {urgentCount}건 마감 임박 (7일 이내)
                  </p>
                )}
              </div>
              <div className="text-sm text-gray-600">
                30개+ 부처 · 80개+ 전문기관 공고
              </div>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
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
            className="inline-flex items-center justify-center border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            요금제 보기
          </Link>
        </div>
      </section>

      {/* NTIS Pain Points Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            NTIS 이용 시 이런 불편함 겪으셨나요?
          </h2>
          <p className="text-gray-600 mb-8">대부분의 연구자와 기업이 공감하는 문제들입니다</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-4">🔍</div>
              <h3 className="font-semibold text-gray-900 mb-2">검색이 어려움</h3>
              <p className="text-gray-600 text-sm">
                키워드 검색으로는 원하는 과제를 찾기 어렵고,
                부처/기관별로 분산되어 있어 일일이 확인해야 합니다.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="font-semibold text-gray-900 mb-2">자격 요건 확인이 번거로움</h3>
              <p className="text-gray-600 text-sm">
                각 과제마다 지원 자격, TRL 요구사항, 기업 규모 제한 등을
                PDF 공고문을 열어 직접 확인해야 합니다.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="font-semibold text-gray-900 mb-2">마감일 관리가 힘듦</h3>
              <p className="text-gray-600 text-sm">
                관심 있는 과제들의 마감일을 따로 관리해야 하고,
                놓치면 1년을 기다려야 하는 경우도 많습니다.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-3xl mb-4">📱</div>
              <h3 className="font-semibold text-gray-900 mb-2">모바일 이용 불편</h3>
              <p className="text-gray-600 text-sm">
                NTIS 사이트는 모바일 환경에서 사용하기 불편하고,
                이동 중에 빠르게 확인하기 어렵습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Connect Solution Section */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connect가 해결합니다
          </h2>
          <p className="text-gray-600 mb-8">AI 기반 맞춤 매칭으로 시간을 절약하세요</p>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-6 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI 맞춤 매칭</h3>
                <p className="text-gray-600">
                  회사 프로필(산업 분야, TRL, 규모)을 기반으로 AI가 적합한 과제를 자동 추천합니다.
                  수백 개의 공고를 일일이 확인할 필요가 없습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">자격 요건 자동 필터링</h3>
                <p className="text-gray-600">
                  지원 불가능한 과제는 미리 제외하고, TRL 요구사항, 기업 규모 제한 등을
                  프로필과 자동 비교하여 매칭합니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-green-50 rounded-xl border border-green-100">
              <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">마감 알림 자동화</h3>
                <p className="text-gray-600">
                  저장한 과제의 마감 7일/3일/1일 전에 자동으로 이메일 알림을 보내드립니다.
                  더 이상 마감일을 놓칠 걱정이 없습니다.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-6 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-600 text-white rounded-lg flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">실시간 업데이트</h3>
                <p className="text-gray-600">
                  NTIS, KEIT, IITP, TIPA 등 주요 기관의 공고를 매일 자동으로 수집합니다.
                  새로운 공고가 올라오면 바로 매칭 대상에 포함됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            NTIS vs Connect 비교
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-xl border border-gray-200">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-gray-600 font-medium">기능</th>
                  <th className="px-6 py-4 text-center text-gray-600 font-medium">NTIS</th>
                  <th className="px-6 py-4 text-center text-blue-600 font-medium">Connect</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 text-gray-900">맞춤형 추천</td>
                  <td className="px-6 py-4 text-center text-gray-400">✗</td>
                  <td className="px-6 py-4 text-center text-green-600">✓ AI 기반</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 text-gray-900">자격 요건 자동 필터링</td>
                  <td className="px-6 py-4 text-center text-gray-400">✗</td>
                  <td className="px-6 py-4 text-center text-green-600">✓</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 text-gray-900">마감 알림</td>
                  <td className="px-6 py-4 text-center text-gray-400">✗</td>
                  <td className="px-6 py-4 text-center text-green-600">✓ D-7, D-3, D-1</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 text-gray-900">모바일 최적화</td>
                  <td className="px-6 py-4 text-center text-gray-400">△</td>
                  <td className="px-6 py-4 text-center text-green-600">✓</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-6 py-4 text-gray-900">통합 검색</td>
                  <td className="px-6 py-4 text-center text-gray-400">부분적</td>
                  <td className="px-6 py-4 text-center text-green-600">✓ 80개+ 기관</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-gray-900">이용료</td>
                  <td className="px-6 py-4 text-center text-green-600">무료</td>
                  <td className="px-6 py-4 text-center text-blue-600">무료~월 ₩20,900</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500 mt-4 text-center">
            * Connect는 NTIS를 대체하는 서비스가 아니라, NTIS 데이터를 기반으로 맞춤 매칭을 제공하는 보완 서비스입니다.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            3분만에 시작하기
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">회원가입</h3>
              <p className="text-gray-600 text-sm">
                카카오/네이버/구글 계정으로<br />30초 만에 가입
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">프로필 설정</h3>
              <p className="text-gray-600 text-sm">
                산업 분야, TRL, 기업 규모 등<br />간단한 정보 입력
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">매칭 확인</h3>
              <p className="text-gray-600 text-sm">
                AI가 추천한 맞춤 과제<br />바로 확인 가능
              </p>
            </div>
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
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Connect는 NTIS를 대체하나요?
              </h3>
              <p className="text-gray-600">
                아니요, Connect는 NTIS를 대체하는 것이 아니라 보완합니다.
                NTIS에 등록된 공고 데이터를 기반으로 AI 맞춤 매칭을 제공합니다.
                실제 과제 신청은 각 기관 시스템(NTIS, RCMS 등)에서 진행합니다.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                어떤 기관의 공고가 포함되나요?
              </h3>
              <p className="text-gray-600">
                과기정통부(IITP), 산업부(KEIT), 중기부(TIPA), 해수부(KIMST) 등
                30개 이상 부처와 80개 이상 전문기관의 R&D 과제 공고를 통합하여 제공합니다.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                무료로 이용할 수 있나요?
              </h3>
              <p className="text-gray-600">
                네, 무료 플랜에서 매월 2회 AI 매칭을 생성할 수 있습니다.
                더 많은 매칭과 마감 알림, AI 상세 분석이 필요하시면 Pro 플랜(월 ₩20,900)을 이용하세요.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                개인 연구자도 이용할 수 있나요?
              </h3>
              <p className="text-gray-600">
                네, 기업뿐 아니라 대학, 연구기관 소속 연구자도 이용 가능합니다.
                프로필 설정 시 기관 유형을 선택하시면 됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            더 이상 NTIS에서 헤매지 마세요
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            AI가 귀사에 맞는 정부 R&D 과제를 찾아드립니다.
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
          <p className="text-blue-200 text-sm mt-4">
            가입 후 바로 AI 매칭 결과 확인 가능 · 신용카드 없이 시작
          </p>
        </div>
      </section>
    </main>
  );
}
