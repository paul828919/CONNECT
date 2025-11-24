'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Building2, GraduationCap, Microscope, CheckCircle2, TrendingUp, Users, Award, Shield, Zap, Ship } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-0.5">
            <Image
              src="/logo.svg"
              alt="Connect Logo"
              width={48}
              height={48}
              className="w-[48px] h-[48px] -mr-2"
            />
            <span className="text-xl font-bold text-gray-900">Connect</span>
          </div>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
          >
            로그인
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-4 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <Zap className="w-4 h-4 mr-2" aria-hidden="true" />
                AI 기반 매칭 엔진
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                국가 R&D 사업,
                <br />
                <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  이제 놓치지 마세요
                </span>
              </h1>

              <p className="text-xl text-gray-600 leading-relaxed">
                4개 핵심 연구관리 전문기관의 연구과제 공고를 커넥트 에이전트가 분석하여
                <br />
                당신에게 딱 맞는 연구과제의 기회를 매칭해드립니다
              </p>

              {/* Stats - Production Safe Version */}
              <div className="flex flex-wrap gap-8 pt-4">
                <div className="relative">
                  <div className="text-3xl font-bold text-blue-600">연 1,000+</div>
                  <div className="text-sm text-gray-600">매칭 목표</div>
                </div>
                <div className="relative">
                  <div className="text-3xl font-bold text-blue-600">4개 기관</div>
                  <div className="text-sm text-gray-600">주요 연구과제 공고</div>
                </div>
                <div className="relative">
                  <div className="text-3xl font-bold text-blue-600">&lt;5분</div>
                  <div className="text-sm text-gray-600">매칭 소요시간</div>
                </div>
              </div>

              <p className="text-xs text-gray-500 italic">
                * 매칭 목표 수치는 플랫폼 목표이며 실제 성과와 다를 수 있습니다
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="무료로 시작하기"
                >
                  무료로 시작하기
                  <ArrowRight className="ml-2 w-5 h-5" aria-hidden="true" />
                </Link>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors border-2 border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="작동 방식 보기"
                >
                  작동 방식 보기
                </button>
              </div>

              <p className="text-sm text-gray-500">
                ✓ 신용카드 불필요 · ✓ 3분 만에 시작 · ✓ 매월 3회 무료 매칭
              </p>
            </div>

            {/* Visual Element - Matching Diagram */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <div className="space-y-6">
                  {/* Center Hub */}
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Zap className="w-12 h-12 text-white" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Connecting Lines Visual */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-4 bg-blue-50 rounded-xl">
                      <Building2 className="w-8 h-8 text-blue-600 mb-2" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700">기업</span>
                      <span className="text-xs text-gray-500 mt-1">목표</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-green-50 rounded-xl">
                      <GraduationCap className="w-8 h-8 text-green-600 mb-2" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700">대학</span>
                      <span className="text-xs text-gray-500 mt-1">목표</span>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-purple-50 rounded-xl">
                      <Microscope className="w-8 h-8 text-purple-600 mb-2" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-700">연구소</span>
                      <span className="text-xs text-gray-500 mt-1">목표</span>
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-500 pt-2">
                    AI가 빠르게 최적의 매칭을 찾습니다
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                정기 업데이트
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators - 4 Agencies Section */}
      <section className="py-16 px-4 bg-white border-y border-gray-100">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-sm text-gray-500 mb-2">국가 R&D사업 공고 출처</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              4개 핵심 연구관리 전문기관 모니터링
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              정부 R&D 예산의 40-55%를 차지하는 주요 전문기관의
              연구과제 공고를 정기적으로 수집·분석합니다
            </p>
          </div>

          {/* Agency Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 max-w-5xl mx-auto">
            {[
              { code: 'iitp', nameKr: '정보통신기획평가원', nameEn: 'IITP', ministry: '과기정통부', icon: Building2 },
              { code: 'keit', nameKr: '한국산업기술평가관리원', nameEn: 'KEIT', ministry: '산업통상자원부', icon: Building2 },
              { code: 'tipa', nameKr: '중소기업기술정보진흥원', nameEn: 'TIPA', ministry: '중소벤처기업부', icon: Building2 },
              { code: 'kimst', nameKr: '해양수산과학기술진흥원', nameEn: 'KIMST', ministry: '해양수산부', icon: Ship },
            ].map((agency) => {
              const Icon = agency.icon;
              return (
                <div
                  key={agency.code}
                  className="p-6 rounded-xl border-2 transition-all hover:shadow-lg hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:border-blue-300"
                >
                  {/* Icon */}
                  <div className="mb-4 flex justify-center">
                    <Icon className="w-10 h-10 text-blue-600" aria-hidden="true" />
                  </div>

                  {/* Korean Name */}
                  <div className="text-center mb-2">
                    <div className="font-bold text-sm text-gray-900 leading-tight mb-1">
                      {agency.nameKr}
                    </div>
                    <div className="text-xs font-semibold text-gray-600">
                      {agency.nameEn}
                    </div>
                  </div>

                  {/* Ministry */}
                  <div className="text-xs text-center text-gray-500 mt-3 pt-3 border-t border-blue-200">
                    {agency.ministry}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">4개</div>
              <div className="text-xs text-gray-600 mt-1">핵심 전문기관</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">40-55%</div>
              <div className="text-xs text-gray-600 mt-1">예산 커버리지</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">정기</div>
              <div className="text-xs text-gray-600 mt-1">공고 수집</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">AI 분석</div>
              <div className="text-xs text-gray-600 mt-1">매칭 엔진</div>
            </div>
          </div>

          {/* Expansion note */}
          <div className="text-center text-sm text-gray-600 mb-4">
            베타 사용자 피드백을 기반으로 단계적 확장 예정입니다
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-400">
            * 상기 기관과의 공식 파트너십을 의미하지 않습니다.
            공개된 공고 정보를 수집·분석하여 제공하는 서비스입니다.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              3단계로 완성되는 연구과제 매칭
            </h2>
            <p className="text-xl text-gray-600">
              복잡한 연구과제 공고 검색은 이제 그만. 커넥트가 대신 찾아드립니다
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                프로필 등록
              </h3>
              <p className="text-gray-600 leading-relaxed">
                기업 정보, 연구 분야, 기술 역량을 간단히 입력하세요. AI가 자동으로 분석하여 최적의 매칭 프로필을 생성합니다.
              </p>
              <ul className="mt-6 space-y-2">
                <li className="flex items-start text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  3분 만에 완료
                </li>
                <li className="flex items-start text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  자동 기술 분류
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                커넥트 에이전트(AI) 매칭
              </h3>
              <p className="text-gray-600 leading-relaxed">
                4개 핵심 연구관리 전문기관의 연구과제 공고를 커넥트의 에이전트가 검색과 분석. 당신의 프로필에 맞는 기회를 찾아드립니다.
              </p>
              <ul className="mt-6 space-y-2">
                <li className="flex items-start text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  높은 매칭 정확도
                </li>
                <li className="flex items-start text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  정기 알림
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                협력 시작
              </h3>
              <p className="text-gray-600 leading-relaxed">
                매칭된 기관과 즉시 연결. 협업 제안서 템플릿과 지원 가이드로 빠르게 협력을 시작하세요.
              </p>
              <ul className="mt-6 space-y-2">
                <li className="flex items-start text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  제안서 템플릿 제공
                </li>
                <li className="flex items-start text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  전문가 매칭 지원
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              왜 Connect를 선택해야 할까요?
            </h2>
            <p className="text-xl text-gray-600">
              단순한 공고 검색 게시판이 아닙니다. 성공적인 R&D를 위한 완전한 솔루션입니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl p-8 border border-blue-200">
              <TrendingUp className="w-12 h-12 text-blue-600 mb-6" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                4개 핵심 기관 집중 모니터링
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                과기정통부, 산업부, 중기부, 해수부의 주요 R&D 기관 공고를 정기적으로 수집하고 분석합니다. 더 이상 여러 사이트를 방문할 필요가 없습니다.
              </p>
              <div className="bg-white rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">현재 모니터링</span>
                  <span className="font-bold text-blue-600">4개 핵심 기관</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl p-8 border border-green-200">
              <Users className="w-12 h-12 text-green-600 mb-6" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                산학연 협력 네트워크
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                기업, 대학, 연구소가 참여하는 협력 네트워크에서 최적의 파트너를 찾으세요. 기술 이전부터 공동 연구까지 모든 협력이 가능합니다.
              </p>
              <div className="bg-white rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">네트워크 구축</span>
                  <span className="font-bold text-green-600">진행 중</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl p-8 border border-purple-200">
              <Award className="w-12 h-12 text-purple-600 mb-6" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                AI 기반 매칭 엔진
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                자연어 처리와 머신러닝으로 공고 요구사항과 귀사의 역량을 분석. 높은 매칭 정확도를 제공합니다.
              </p>
              <div className="bg-white rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">매칭 방식</span>
                  <span className="font-bold text-purple-600">AI 기반</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl p-8 border border-orange-200">
              <Shield className="w-12 h-12 text-orange-600 mb-6" aria-hidden="true" />
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                데이터 보안 및 개인정보 보호
              </h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                사업자등록번호는 AES-256-GCM 암호화로 보호되며, PIPA(개인정보보호법) 규정을 준수합니다.
              </p>
              <div className="bg-white rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">보안 수준</span>
                  <span className="font-bold text-orange-600">암호화 적용</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Expectations - Production Safe (replaces fake testimonials) */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          {/* Beta Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-blue-600 mb-2">50</div>
              <div className="text-sm text-gray-600">Beta Users</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-green-600 mb-2">200-500</div>
              <div className="text-sm text-gray-600">Active Programs</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-purple-600 mb-2">4</div>
              <div className="text-sm text-gray-600">Major Agencies</div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100">
              <div className="text-4xl font-bold text-orange-600 mb-2">38%</div>
              <div className="text-sm text-gray-600">Avg Match Quality</div>
            </div>
          </div>

          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Connect가 제공하는 가치
            </h2>
            <p className="text-lg text-gray-600">실제 사용자들의 기대와 목표</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Building2 className="w-6 h-6 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">기업 사용자</div>
                  <div className="text-sm text-gray-500">AI 스타트업</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                &quot;복잡한 국가 공고를 일일이 찾아보는 시간을 절약하고, 우리 기술에 맞는 과제를 빠르게 발견하고 싶습니다.&quot;
              </p>
              <div className="text-sm text-gray-500">
                기대 효과: 공고 검색 시간 단축 및 매칭 정확도 향상
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <GraduationCap className="w-6 h-6 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">대학 사용자</div>
                  <div className="text-sm text-gray-500">산학협력단</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                &quot;우리 연구실의 기술을 필요로 하는 산업체 파트너를 쉽게 찾고, 실제 사업화로 연결하고 싶습니다.&quot;
              </p>
              <div className="text-sm text-gray-500">
                기대 효과: 산학 협력 기회 확대 및 기술 이전 활성화
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <Microscope className="w-6 h-6 text-purple-600" aria-hidden="true" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">연구소 사용자</div>
                  <div className="text-sm text-gray-500">정부출연연구기관</div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed mb-4">
                &quot;정기적으로 업데이트되는 공고 알림을 통해 우리 연구 분야에 맞는 과제를 놓치지 않고 지원하고 싶습니다.&quot;
              </p>
              <div className="text-sm text-gray-500">
                기대 효과: 적합한 R&D 과제 발굴 및 선정 성공률 증대
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            지금 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-12 leading-relaxed">
            3분 만에 가입하고, 오늘부터 맞춤형 연구과제 기회를 받아보세요.
            <br />
            무료 플랜으로 시작할 수 있습니다. 신용카드도 필요 없습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center px-10 py-5 bg-white text-blue-600 font-bold rounded-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 text-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
              aria-label="무료로 시작하기"
            >
              무료로 시작하기
              <ArrowRight className="ml-2 w-6 h-6" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-blue-100 text-sm">
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" aria-hidden="true" />
              신용카드 불필요
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" aria-hidden="true" />
              3분 만에 시작
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" aria-hidden="true" />
              매월 3회 무료 매칭
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-0.5 mb-4">
                <Image
                  src="/logo.svg"
                  alt="Connect Logo"
                  width={48}
                  height={48}
                  className="w-[48px] h-[48px] -mr-2"
                />
                <span className="text-xl font-bold text-white">Connect</span>
              </div>
              <p className="text-sm leading-relaxed">
                한국 R&D 생태계를 연결하는 지능형 매칭 플랫폼
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">기능 소개</a></li>
                <li><a href="/auth/signin" className="hover:text-white transition-colors">무료 시작</a></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">요금제</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/support" className="hover:text-white transition-colors">고객 지원</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">회사 소개</a></li>
                <li><a href="#" className="hover:text-white transition-colors">문의</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-sm">
            <div className="flex justify-center gap-6 mb-4">
              <Link href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-white transition-colors">이용약관</Link>
              <Link href="/refund-policy" className="hover:text-white transition-colors">환불 정책</Link>
            </div>
            <div className="text-center">
              © 2025 Innowave. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
