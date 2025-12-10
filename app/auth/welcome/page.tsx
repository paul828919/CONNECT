'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="mb-6 mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Connect에 오신 것을 환영합니다! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            국가 R&D 생태계 플랫폼
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-50">
            <div className="mt-1 flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">조직 프로필 생성</h3>
              <p className="text-sm text-gray-600">
                귀하의 조직(기업, 국가연구기관, 대학교 연구팀, 공공기관) 프로필을 완성하세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-purple-50">
            <div className="mt-1 flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">맞춤형 매칭</h3>
              <p className="text-sm text-gray-600">
                연구과제 전문기관의 전체 연구과제 중 귀하에게 최적화된 연구과제 기회를 매칭받으세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-indigo-50">
            <div className="mt-1 flex-shrink-0 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">컨소시엄 구축</h3>
              <p className="text-sm text-gray-600">
                귀하의 조직 프로필과 협업 요청사항 기반으로 컨소시엄 기관을 추천받으세요.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50">
            <div className="mt-1 flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">4</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">쉽고 빠른 지원</h3>
              <p className="text-sm text-gray-600">
                매칭된 연구과제 공고를 확인하고 간편하게 지원하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">30+</p>
            <p className="text-xs text-gray-600 mt-1">부처</p>
          </div>
          <div className="text-center border-l border-r border-gray-200">
            <p className="text-2xl font-bold text-purple-600">80+</p>
            <p className="text-xs text-gray-600 mt-1">연구과제 전문기관</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">1,600+</p>
            <p className="text-xs text-gray-600 mt-1">연구과제</p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/dashboard/profile/create"
            className="block w-full py-4 px-6 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            조직 프로필 생성하기
          </Link>
          <Link
            href="/dashboard"
            className="block w-full py-4 px-6 bg-gray-100 text-gray-700 text-center font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            대시보드로 이동
          </Link>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">
            무료 플랜으로 매월 3회 매칭을 받을 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
