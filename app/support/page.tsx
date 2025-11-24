/**
 * Customer Support Page (고객 지원)
 * Korean-only support page for Connect SaaS platform
 */

import Link from 'next/link';
import Image from 'next/image';
import { Headphones, Mail, Clock, HelpCircle, FileText, Shield, Users, CreditCard, Wrench, Database } from 'lucide-react';

export default function CustomerSupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header - Matching Landing Page */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-0.5">
            <Image
              src="/logo.svg"
              alt="Connect Logo"
              width={48}
              height={48}
              className="w-[48px] h-[48px] -mr-2"
            />
            <span className="text-xl font-bold text-gray-900">Connect</span>
          </Link>
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
          >
            로그인
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 pt-32 pb-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Headphones className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">고객 지원</h1>
          </div>
          <p className="text-lg text-gray-600">
            Connect 서비스 이용에 도움이 필요하신가요? 언제든지 문의해 주세요.
          </p>
        </div>

        {/* Contact Information Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">문의 방법</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">이메일 문의</h3>
                <a href="mailto:support@connetplt.kr" className="text-blue-600 hover:text-blue-700">
                  support@connetplt.kr
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">응답 시간</h3>
                <p className="text-gray-600">2~4시간 이내</p>
                <p className="text-sm text-gray-500">(월-금, 업무시간 내)</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">운영 시간</h3>
                <p className="text-gray-600">오전 10시 - 오후 5시</p>
                <p className="text-sm text-gray-500">(주말 및 공휴일 제외)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">지원 카테고리</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Category 1: Account & Login */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <Users className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">계정 및 로그인</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• 카카오/네이버 OAuth 로그인 문제</li>
                <li>• 회원가입 오류</li>
                <li>• 비밀번호 재설정</li>
                <li>• 계정 정보 수정</li>
              </ul>
            </div>

            {/* Category 2: Matching Service */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <HelpCircle className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">매칭 서비스</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• R&D 펀딩 매칭 알고리즘</li>
                <li>• 매칭 점수 해석</li>
                <li>• 추천 프로그램 관리</li>
                <li>• 매칭 결과 피드백</li>
              </ul>
            </div>

            {/* Category 3: Organization Profile */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <FileText className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">조직 프로필</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• 조직 정보 등록 및 수정</li>
                <li>• 사업자등록번호 인증</li>
                <li>• 산업 분야 및 TRL 설정</li>
                <li>• 인증서 업로드</li>
              </ul>
            </div>

            {/* Category 4: Subscription & Payment */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <CreditCard className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">구독 및 결제</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• 구독 플랜 변경</li>
                <li>• 결제 정보 업데이트</li>
                <li>• 청구서 및 영수증 요청</li>
                <li>• 환불 정책 문의</li>
              </ul>
            </div>

            {/* Category 5: Technical Support */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <Wrench className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">기술 지원</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• 브라우저 호환성 문제</li>
                <li>• 페이지 로딩 오류</li>
                <li>• 기능 작동 불량</li>
                <li>• 파일 업로드 문제</li>
              </ul>
            </div>

            {/* Category 6: Data & Security */}
            <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
              <Database className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">데이터 및 보안</h3>
              <ul className="text-gray-600 space-y-2 text-sm">
                <li>• 개인정보 처리 문의</li>
                <li>• 데이터 암호화 정책</li>
                <li>• 정보 수정 및 삭제 요청</li>
                <li>• 보안 관련 문의</li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQs Section */}
        <div className="bg-white rounded-lg shadow-xl p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-6">
            {/* FAQ 1 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">Connect는 어떤 서비스인가요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                Connect는 한국의 R&D 상용화 운영 시스템으로, 기업·연구소·대학이 정부 R&D 펀딩을 발견하고 신청하여 수주까지 지원하는 플랫폼입니다. 자동화된 매칭과 전문 실행 서비스를 결합한 하이브리드 비즈니스 모델을 제공합니다.
              </p>
            </details>

            {/* FAQ 2 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">매칭 알고리즘은 어떻게 작동하나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                매칭 알고리즘은 산업 관련성(30점), TRL 레벨(20점), 조직 유형(20점), R&D 경험(15점), 신청 마감일(15점)을 종합적으로 분석하여 귀하의 조직에 가장 적합한 R&D 프로그램을 추천합니다.
              </p>
            </details>

            {/* FAQ 3 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">사업자등록번호는 어떻게 보호되나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                사업자등록번호는 AES-256-GCM 알고리즘으로 암호화되어 데이터베이스에 저장됩니다. 개인정보 보호법(PIPA) 및 정보통신망법을 준수하며, 접근 권한이 엄격히 통제됩니다.
              </p>
            </details>

            {/* FAQ 4 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">구독 플랜을 변경할 수 있나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                예, 언제든지 구독 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 대시보드의 &quot;구독 관리&quot; 메뉴에서 플랜을 변경하실 수 있으며, 변경 사항은 다음 결제 주기부터 적용됩니다.
              </p>
            </details>

            {/* FAQ 5 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">어떤 브라우저를 지원하나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                Connect는 Chrome, Firefox, Safari, Edge의 최신 버전을 지원합니다. 최적의 사용 경험을 위해 브라우저를 최신 버전으로 업데이트해 주시기 바랍니다.
              </p>
            </details>

            {/* FAQ 6 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">계정을 삭제하려면 어떻게 해야 하나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                계정 삭제를 원하시면 support@connetplt.kr로 이메일을 보내주세요. 계정 삭제 요청 처리 시 모든 개인정보와 조직 정보가 영구적으로 삭제되며, 이는 되돌릴 수 없습니다.
              </p>
            </details>

            {/* FAQ 7 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">연구기관도 서비스를 이용할 수 있나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                예, Connect는 기업뿐만 아니라 정부출연연구소, 정부부처 소속 연구소, 지자체 소속 연구소, 대학교수 연구팀, 대학 부설 연구소 등 모든 R&D 수행 조직을 지원합니다.
              </p>
            </details>

            {/* FAQ 8 */}
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="font-semibold text-gray-900">매칭 결과가 부정확하다고 느껴지면 어떻게 하나요?</span>
                <span className="transition group-open:rotate-180">
                  <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </span>
              </summary>
              <p className="text-gray-600 mt-4 pl-4">
                매칭 결과에 대한 피드백은 언제든지 환영합니다. support@connetplt.kr로 구체적인 내용을 보내주시면, 알고리즘 개선에 반영하겠습니다. 또한 조직 프로필 정보를 상세하게 업데이트하시면 매칭 정확도가 향상됩니다.
              </p>
            </details>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">추가 자료</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/guide" className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">이용 가이드</h3>
                <p className="text-sm text-gray-600">Connect 플랫폼 사용 방법을 상세히 안내합니다.</p>
              </div>
            </Link>
            <Link href="/privacy" className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">개인정보처리방침</h3>
                <p className="text-sm text-gray-600">개인정보 보호 정책 및 데이터 처리 방침을 확인하세요.</p>
              </div>
            </Link>
            <Link href="/terms" className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">이용약관</h3>
                <p className="text-sm text-gray-600">서비스 이용 약관 및 주요 규정을 확인하세요.</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
