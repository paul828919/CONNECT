'use client';

/**
 * Customer Support Page (고객 지원)
 * Korean-only support page for Connect SaaS platform
 */

import Link from 'next/link';
import { Headphones, Mail, Clock, HelpCircle, FileText, Shield, Users, CreditCard, Wrench, Database, ChevronLeft } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';

export default function CustomerSupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <PublicHeader />

      {/* Content */}
      <div className="container mx-auto px-4 pt-32 pb-12 max-w-6xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            홈으로
          </Link>
        </div>
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

        {/* Additional Resources */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">추가 자료</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/faq" className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
              <HelpCircle className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">자주 묻는 질문</h3>
                <p className="text-sm text-gray-600">Connect 서비스에 관한 FAQ를 확인하세요.</p>
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
