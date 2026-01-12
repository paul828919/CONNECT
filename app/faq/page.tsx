'use client';

/**
 * FAQ Page (자주 묻는 질문)
 * Dedicated FAQ page for Connect platform
 */

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'Connect는 어떤 서비스인가요?',
    answer: 'Connect는 국가R&D사업 매칭 시스템으로, 기업·연구기관·대학에게 맞춤형 연구개발 과제를 제공하는 플랫폼입니다. Connect의 AI기반 매칭 엔진은 국가R&D사업의 전문분야별 전체 연구개발과제와 산학연컨소시엄 매칭 서비스를 사용자에게 실시간으로 제공합니다.',
  },
  {
    question: '매칭 알고리즘은 어떻게 작동하나요?',
    answer: '매칭 알고리즘은 산업 관련성(30점), TRL 레벨(20점), 조직 유형(20점), R&D 경험(15점), 신청 마감일(15점)을 종합적으로 분석하여 귀하의 조직에 가장 적합한 R&D 프로그램을 추천합니다.',
  },
  {
    question: '사업자등록번호는 어떻게 보호되나요?',
    answer: '사업자등록번호는 AES-256-GCM 알고리즘으로 암호화되어 데이터베이스에 저장됩니다. 개인정보 보호법(PIPA) 및 정보통신망법을 준수하며, 접근 권한이 엄격히 통제됩니다.',
  },
  {
    question: '구독 플랜을 변경할 수 있나요?',
    answer: '예, 언제든지 구독 플랜을 업그레이드하거나 다운그레이드할 수 있습니다. 대시보드의 "구독 관리" 메뉴에서 플랜을 변경하실 수 있으며, 변경 사항은 다음 결제 주기부터 적용됩니다.',
  },
  {
    question: '어떤 브라우저를 지원하나요?',
    answer: 'Connect는 Chrome, Firefox, Safari, Edge의 최신 버전을 지원합니다. 최적의 사용 경험을 위해 브라우저를 최신 버전으로 업데이트해 주시기 바랍니다.',
  },
  {
    question: '계정을 삭제하려면 어떻게 해야 하나요?',
    answer: '계정 삭제를 원하시면 support@connectplt.kr로 이메일을 보내주세요. 계정 삭제 요청 처리 시 모든 개인정보와 조직 정보가 영구적으로 삭제되며, 이는 되돌릴 수 없습니다.',
  },
  {
    question: '연구기관도 서비스를 이용할 수 있나요?',
    answer: '예, Connect는 기업뿐만 아니라 정부출연연구소, 정부부처 소속 연구소, 지자체 소속 연구소, 대학교수 연구팀, 대학 부설 연구소 등 모든 R&D 수행 조직을 지원합니다.',
  },
  {
    question: '매칭 결과가 부정확하다고 느껴지면 어떻게 하나요?',
    answer: '매칭 결과에 대한 피드백은 언제든지 환영합니다. support@connectplt.kr로 구체적인 내용을 보내주시면, 알고리즘 개선에 반영하겠습니다. 또한 조직 프로필 정보를 상세하게 업데이트하시면 매칭 정확도가 향상됩니다.',
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <PublicHeader />

      {/* Content */}
      <div className="container mx-auto px-4 pt-32 pb-12 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">자주 묻는 질문</h1>
          </div>
          <p className="text-lg text-gray-600">
            Connect 서비스에 대해 자주 묻는 질문과 답변을 확인하세요.
          </p>
        </div>

        {/* FAQ List */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details key={index} className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                  <span className="transition-transform duration-200 group-open:rotate-180 flex-shrink-0">
                    <svg
                      fill="none"
                      height="24"
                      shapeRendering="geometricPrecision"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      width="24"
                    >
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </span>
                </summary>
                <p className="text-gray-600 mt-4 pl-4 pb-2">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-8 text-center bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            원하는 답변을 찾지 못하셨나요?
          </h3>
          <p className="text-gray-600 mb-4">
            고객 지원팀에 문의하시면 더 자세한 도움을 받으실 수 있습니다.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            고객 지원 문의하기
          </Link>
        </div>
      </div>
    </div>
  );
}
