/**
 * Terms of Service Page (이용약관)
 * Redesigned based on Naver policy style
 */

'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Page Title */}
      <div className="bg-white border-b border-gray-200 pt-20">
        <div className="container mx-auto px-4 py-5 max-w-5xl">
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">이용약관</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
            <div className="space-y-8">
              {/* 시행일 */}
              <div className="text-right text-sm text-gray-600">
                시행일자: 2025년 1월 10일
              </div>

              {/* 서문 */}
              <section>
                <p className="text-gray-700 leading-relaxed">
                  Connect 서비스 및 제품(이하 &apos;서비스&apos;)을 이용해 주셔서 감사합니다. 본 약관은 다양한 Connect 서비스의 이용과 관련하여 Connect 서비스를 제공하는 이노웨이브(이하 &apos;Connect&apos;)와 이를 이용하는 Connect 서비스 회원(이하 &apos;회원&apos;) 또는 비회원과의 관계를 설명하며, 아울러 여러분의 Connect 서비스 이용에 도움이 될 수 있는 유익한 정보를 포함하고 있습니다.
                </p>
              </section>

              {/* 여러분을 환영합니다 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  여러분을 환영합니다.
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect 서비스 및 제품(이하 &apos;서비스&apos;)을 이용해 주셔서 감사합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  본 약관은 다양한 Connect 서비스의 이용과 관련하여 Connect 서비스를 제공하는 이노웨이브(이하 &apos;Connect&apos;)와 이를 이용하는 Connect 서비스 회원(이하 &apos;회원&apos;) 또는 비회원과의 관계를 설명하며, 아울러 여러분의 Connect 서비스 이용에 도움이 될 수 있는 유익한 정보를 포함하고 있습니다.
                </p>
                <p className="text-green-600 font-semibold leading-relaxed mb-3">
                  Connect 서비스를 이용하시거나 Connect 서비스 회원으로 가입하실 경우 여러분은 본 약관 및 관련 운영 정책을 확인하거나 동의하게 되므로, 잠시 시간을 내시어 주의 깊게 살펴봐 주시기 바랍니다.
                </p>
              </section>

              {/* 다양한 Connect 서비스를 즐겨 보세요 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  다양한 Connect 서비스를 즐겨 보세요.
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect는 국가 R&D 과제 매칭 플랫폼으로서, 다음과 같은 서비스를 제공합니다:
                </p>
                <ul className="space-y-2 text-gray-700 ml-6">
                  <li className="leading-relaxed">• R&D 펀딩 프로그램 정보 수집 및 매칭</li>
                  <li className="leading-relaxed">• 조직 프로필 관리 (기업/대학/연구소)</li>
                  <li className="leading-relaxed">• 맞춤형 매칭 알고리즘 제공</li>
                  <li className="leading-relaxed">• 매칭 결과 열람 및 알림</li>
                  <li className="leading-relaxed">• 기타 Connect가 정하는 서비스</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  Connect는 여러분이 본 약관 내용에 동의하는 경우, Connect 정책 및 개별 서비스 이용약관에 따라 각 개별 서비스를 이용할 수 있도록 합니다.
                </p>
              </section>

              {/* 회원 가입 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  회원 가입
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  여러분은 Connect가 제공하는 간편한 가입 절차를 통해 회원 가입을 신청할 수 있으며, Connect는 이에 대한 승낙을 통해 회원 가입 절차를 완료하고 여러분에게 Connect 서비스 이용 계정을 부여합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  회원 가입은 카카오 또는 네이버 소셜 로그인을 통해 이루어지며, Connect는 OAuth 제공자로부터 받은 정보(이메일, 닉네임, 프로필 이미지)를 활용하여 회원을 식별합니다.
                </p>
                <p className="text-green-600 font-semibold leading-relaxed">
                  Connect 서비스 이용을 위해 가입하실 때 허위 정보를 제공해서는 안 됩니다. 회원 가입 시 등록한 사항에 변동이 있는 경우, 즉시 정보를 수정하거나 Connect에 알려주셔야 합니다.
                </p>
              </section>

              {/* Connect 계정 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  Connect 계정
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  회원으로 가입하시면 Connect 계정이 생성됩니다. Connect 계정은 여러분이 Connect 서비스를 이용하기 위한 기본 정보이며, 소셜 로그인을 통해 안전하게 관리됩니다.
                </p>
                <p className="text-green-600 font-semibold leading-relaxed mb-3">
                  Connect 계정은 반드시 본인 명의로 등록되어야 하며, 타인에게 양도하거나 대여할 수 없습니다.
                </p>
              </section>

              {/* 서비스 이용 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  서비스 이용
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect는 다음과 같은 서비스를 제공합니다:
                </p>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">R&D 펀딩 프로그램 매칭</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Connect는 4개 핵심 연구관리 전문기관(IITP, KEIT, TIPA, KIMST)의 연구과제 공고를 정기적으로 수집하고 분석합니다. AI 기반 매칭 알고리즘을 통해 회원의 프로필에 적합한 R&D 펀딩 프로그램을 추천합니다.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">조직 프로필 관리</h3>
                    <p className="text-gray-700 leading-relaxed">
                      회원은 기업, 대학, 연구소 등의 조직 프로필을 등록하고 관리할 수 있습니다. 조직 프로필 정보는 매칭 알고리즘에 활용되어 적합한 R&D 펀딩 프로그램을 추천하는 데 사용됩니다.
                    </p>
                  </div>
                </div>
              </section>

              {/* 데이터 보안 및 개인정보 보호 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  데이터 보안 및 개인정보 보호
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect는 회원의 개인정보를 소중히 여기며, 관련 법령에 따라 안전하게 관리합니다.
                </p>
                <ul className="space-y-2 text-gray-700 ml-6">
                  <li className="leading-relaxed">• 회원의 사업자등록번호는 AES-256-GCM 알고리즘으로 암호화되어 저장됩니다.</li>
                  <li className="leading-relaxed">• 「개인정보 보호법」을 준수하여 개인정보를 안전하게 관리합니다.</li>
                  <li className="leading-relaxed">• 회원의 개인정보는 본인의 승낙 없이 제3자에게 제공하지 않습니다.</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mt-4">
                  자세한 내용은 개인정보처리방침 탭에서 확인하실 수 있습니다.
                </p>
              </section>

              {/* 서비스 이용요금 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  서비스 이용요금
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect가 제공하는 서비스는 기본적으로 무료입니다. 다만, Connect는 유료 서비스를 제공할 수 있으며, 이 경우 해당 서비스 이용 전에 이용요금을 명시합니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  유료 서비스 이용요금의 결제는 Connect가 정한 방법(신용카드, 계좌이체 등)을 통해 이루어집니다.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                  <p className="text-sm text-blue-900">
                    📖 <strong>환불 정책:</strong> 유료 서비스의 환불 정책은{' '}
                    <Link href="/refund-policy" className="underline font-semibold hover:text-blue-700">
                      환불 정책 페이지
                    </Link>
                    에서 확인하실 수 있습니다.
                  </p>
                </div>
              </section>

              {/* 회원의 의무 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  회원의 의무
                </h2>
                <p className="text-green-600 font-semibold leading-relaxed mb-3">
                  회원은 다음 행위를 하여서는 안 됩니다:
                </p>
                <ul className="space-y-2 text-gray-700 ml-6">
                  <li className="leading-relaxed">• 신청 또는 변경 시 허위 내용의 등록</li>
                  <li className="leading-relaxed">• 타인의 정보 도용</li>
                  <li className="leading-relaxed">• Connect가 게시한 정보의 변경</li>
                  <li className="leading-relaxed">• Connect 및 제3자의 저작권 등 지적재산권에 대한 침해</li>
                  <li className="leading-relaxed">• Connect 및 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                  <li className="leading-relaxed">• 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                </ul>
              </section>

              {/* 서비스 중단 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  서비스 중단
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다:
                </p>
                <ul className="space-y-2 text-gray-700 ml-6">
                  <li className="leading-relaxed">• 서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
                  <li className="leading-relaxed">• 전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지했을 경우</li>
                  <li className="leading-relaxed">• 국가비상사태, 정전, 서비스 설비의 장애 또는 서비스 이용의 폭주 등으로 서비스 이용에 지장이 있는 경우</li>
                </ul>
              </section>

              {/* 면책 조항 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  면책 조항
                </h2>
                <ul className="space-y-2 text-gray-700 ml-6">
                  <li className="leading-relaxed">• Connect는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 대한 책임이 면제됩니다.</li>
                  <li className="leading-relaxed">• Connect는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                  <li className="leading-relaxed">• Connect는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대하여 책임을 지지 않습니다.</li>
                  <li className="leading-relaxed">• Connect가 제공하는 매칭 서비스는 정보 제공 목적이며, 실제 R&D 프로그램 선정 결과에 대해서는 책임을 지지 않습니다.</li>
                </ul>
              </section>

              {/* 분쟁 해결 */}
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                  분쟁 해결
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Connect는 회원으로부터 제출되는 불만사항 및 의견을 우선적으로 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 회원에게 그 사유와 처리일정을 즉시 통보해 드립니다.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  본 약관은 대한민국 법령에 의하여 규정되고 이행되며, 서비스 이용과 관련하여 Connect와 회원 간에 발생한 분쟁에 대해서는 대한민국 법을 적용합니다.
                </p>
              </section>

              {/* Company Information */}
              <div className="border-t pt-8 mt-12">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Customer Center */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">고객센터</h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>전화 : 070 -8778 - 2378</p>
                      <p>
                        이메일 :{' '}
                        <a href="mailto:support@connectplt.kr" className="text-orange-500 hover:text-orange-600 underline">
                          support@connectplt.kr
                        </a>
                      </p>
                      <p>업무시간 : 영업일 기준 오전 10시 - 오후 5시</p>
                    </div>
                  </div>

                  {/* Company Information */}
                  <div>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>상호명 : 이노웨이브</p>
                      <p>대표자명 : 김 병 진</p>
                      <p>사업자등록번호 : 224 -38 - 00690</p>
                      <p>통신판매업신고번호 : 2025 - 부산기장 - 0558호</p>
                      <p>사업장주소 : 부산광역시 기장군 정관읍 정관중앙로 45, 206호</p>
                      <p>전화 : 070 - 8778 - 2378</p>
                    </div>
                  </div>
                </div>
              </div>
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
