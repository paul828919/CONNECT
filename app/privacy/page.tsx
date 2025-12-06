/**
 * Privacy Policy Page (개인정보처리방침)
 * PIPA-compliant privacy policy - Updated based on compliance review
 * Effective Date: 2025-11-20
 */

'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />

      {/* Page Title - Same style as Terms of Service */}
      <div className="bg-white border-b border-gray-200 pt-20">
        <div className="container mx-auto px-4 py-5 max-w-5xl">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">개인정보처리방침</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="space-y-8">
            {/* 시행일 */}
            <div className="text-right text-sm text-gray-600">
              시행일자: 2025년 11월 20일
            </div>

            {/* 개요 안내 박스 */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
              <p className="text-sm text-blue-900">
                <strong>주요 개인정보 처리 사항</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• 수집 항목: 이메일, 닉네임, 프로필 이미지 (소셜 로그인), 조직 정보</li>
                <li>• 보유 기간: 회원 탈퇴 시까지 (법정 보관 의무 정보 별도)</li>
                <li>• 암호화: 사업자등록번호 AES-256-GCM 암호화</li>
                <li>• 제3자 제공: 동의 없이 제공하지 않음</li>
              </ul>
            </div>

            {/* 목차 */}
            <nav className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4">목차</h2>
              <ol className="space-y-2 text-sm text-gray-700">
                <li><a href="#section1" className="hover:text-blue-600">제1조 (개인정보의 처리 목적)</a></li>
                <li><a href="#section2" className="hover:text-blue-600">제2조 (처리하는 개인정보의 항목)</a></li>
                <li><a href="#section3" className="hover:text-blue-600">제3조 (개인정보의 처리 및 보유 기간)</a></li>
                <li><a href="#section4" className="hover:text-blue-600">제4조 (개인정보의 제3자 제공)</a></li>
                <li><a href="#section5" className="hover:text-blue-600">제5조 (개인정보의 처리 위탁)</a></li>
                <li><a href="#section6" className="hover:text-blue-600">제6조 (개인정보의 파기 절차 및 방법)</a></li>
                <li><a href="#section7" className="hover:text-blue-600">제7조 (정보주체의 권리·의무 및 행사방법)</a></li>
                <li><a href="#section8" className="hover:text-blue-600">제8조 (개인정보의 안전성 확보 조치)</a></li>
                <li><a href="#section9" className="hover:text-blue-600">제9조 (개인정보 보호책임자)</a></li>
                <li><a href="#section10" className="hover:text-blue-600">제10조 (권익침해 구제방법)</a></li>
                <li><a href="#section11" className="hover:text-blue-600">제11조 (개인정보 처리방침의 변경)</a></li>
              </ol>
            </nav>

            {/* 서문 */}
            <section>
              <p className="text-gray-700 leading-relaxed">
                Connect(이하 &quot;회사&quot;)는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
                이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
              </p>
            </section>

            {/* 제1조 - 개인정보의 처리 목적 */}
            <section id="section1">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제1조 (개인정보의 처리 목적)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며,
                이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              </p>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">1. 회원 가입 및 관리</h3>
                  <p className="text-gray-700 text-sm">
                    회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리,
                    서비스 부정이용 방지, 각종 고지·통지, 고충처리 목적으로 개인정보를 처리합니다.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">2. 서비스 제공</h3>
                  <p className="text-gray-700 text-sm">
                    R&D 과제 매칭 서비스 제공, 맞춤형 과제 추천 및 알림, 컨소시엄 구성 지원,
                    조직 프로필 관리, 맞춤형 매칭 알고리즘 제공을 목적으로 개인정보를 처리합니다.
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">3. 마케팅 및 광고 활용</h3>
                  <p className="text-gray-700 text-sm">
                    신규 서비스 개발 및 맞춤형 서비스 제공, 이벤트 및 광고성 정보 제공 (동의한 경우에 한함)을
                    목적으로 개인정보를 처리합니다.
                  </p>
                </div>
              </div>
            </section>

            {/* 제2조 - 처리하는 개인정보의 항목 */}
            <section id="section2">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제2조 (처리하는 개인정보의 항목)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 다음의 개인정보 항목을 처리하고 있습니다.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">1. 회원가입 시 수집 정보 (필수)</h3>
                  <p className="text-gray-700 text-sm mb-2">소셜 로그인 (OAuth 2.0) 연동 정보</p>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>카카오 로그인: 이름, 이메일 주소, 프로필 이미지 URL</li>
                    <li>네이버 로그인: 이름, 이메일 주소, 프로필 이미지 URL</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">2. 조직 프로필 작성 시 수집 정보</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>필수항목: 조직명, 조직 유형, 사업자등록번호 (AES-256-GCM 암호화), 산업 분야, 직원 수</li>
                    <li>선택항목: 조직 설명, R&D 경험, TRL 레벨, 인증서 정보, 웹사이트 URL</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">3. 유료 서비스 이용 시 수집 정보</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>Toss Payments를 통한 결제 승인 키 (orderId, paymentKey)</li>
                    <li>결제 금액, 결제 방법, 구독 플랜 정보</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">4. 자동으로 수집되는 정보</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>접속 IP 주소, 쿠키, 서비스 이용 기록, 방문 일시</li>
                    <li>기기 정보 (브라우저 종류, OS, 화면 크기)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제3조 - 개인정보의 처리 및 보유 기간 */}
            <section id="section3">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제3조 (개인정보의 처리 및 보유 기간)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시
                동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">1. 회원 정보</h3>
                  <p className="text-gray-700 text-sm">회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우 해당 조사 종료 시까지)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">2. 서비스 방문 기록 (로그 기록, 접속 IP)</h3>
                  <p className="text-gray-700 text-sm">3개월 (통신비밀보호법 제15조의2)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">3. 개인정보처리시스템 접속 기록 (관리자 접근 기록)</h3>
                  <p className="text-gray-700 text-sm">1년 이상 (「개인정보의 안전성 확보조치 기준」에 따라 일정 규모 이상 시 2년 이상)</p>
                </div>
              </div>

              {/* 법정 보관 기간 표 */}
              <h3 className="font-bold text-gray-900 mb-3">법령에 따른 보관 의무</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">정보 항목</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">보관 기간</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">법적 근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">계약 또는 청약철회 등에 관한 기록</td>
                      <td className="border border-gray-300 px-4 py-2">5년</td>
                      <td className="border border-gray-300 px-4 py-2">전자상거래법 제6조</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">대금결제 및 재화 등의 공급에 관한 기록</td>
                      <td className="border border-gray-300 px-4 py-2">5년</td>
                      <td className="border border-gray-300 px-4 py-2">전자상거래법 제6조</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">소비자의 불만 또는 분쟁처리에 관한 기록</td>
                      <td className="border border-gray-300 px-4 py-2">3년</td>
                      <td className="border border-gray-300 px-4 py-2">전자상거래법 제6조</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">표시·광고에 관한 기록</td>
                      <td className="border border-gray-300 px-4 py-2">6개월</td>
                      <td className="border border-gray-300 px-4 py-2">전자상거래법 제6조</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">서비스 방문 기록 (로그 기록, 접속 IP)</td>
                      <td className="border border-gray-300 px-4 py-2">3개월</td>
                      <td className="border border-gray-300 px-4 py-2">통신비밀보호법 제15조의2</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                ※ 법령 보관 의무 정보는 별도 데이터베이스에 격리 보관되며, 접근 권한이 제한됩니다.
              </p>
            </section>

            {/* 제4조 - 개인정보의 제3자 제공 */}
            <section id="section4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제4조 (개인정보의 제3자 제공)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 원칙적으로 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며,
                정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만
                개인정보를 제3자에게 제공합니다.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>현재 상태:</strong> 회사는 현재 정보주체의 개인정보를 제3자에게 제공하고 있지 않습니다.
                  컨소시엄 구성 등으로 제3자 제공이 필요한 경우, 별도의 동의를 받습니다.
                </p>
              </div>
            </section>

            {/* 제5조 - 개인정보의 처리 위탁 */}
            <section id="section5">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제5조 (개인정보의 처리 위탁)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 외부 전문업체에 위탁하여 처리하고 있습니다.
              </p>

              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">수탁자</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">위탁 업무 내용</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">보유 기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">AWS SES (Amazon Simple Email Service)</td>
                      <td className="border border-gray-300 px-4 py-2">이메일 발송 서비스 (support@connectplt.kr)</td>
                      <td className="border border-gray-300 px-4 py-2">이메일 발송 완료 시까지</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">Toss Payments</td>
                      <td className="border border-gray-300 px-4 py-2">결제 처리 및 구독 관리</td>
                      <td className="border border-gray-300 px-4 py-2">거래 완료 후 5년 (전자상거래법)</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-medium">카카오</td>
                      <td className="border border-gray-300 px-4 py-2">소셜 로그인 인증</td>
                      <td className="border border-gray-300 px-4 py-2">로그인 세션 유지 기간</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 font-medium">네이버</td>
                      <td className="border border-gray-300 px-4 py-2">소셜 로그인 인증</td>
                      <td className="border border-gray-300 px-4 py-2">로그인 세션 유지 기간</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                <p className="text-sm text-blue-800">
                  <strong>국외 이전:</strong> 회사는 개인정보를 국외로 이전하지 않습니다.
                  모든 데이터는 국내 자체 서버에 저장됩니다. 이메일 발송 서비스만 AWS 서울 리전 (ap-northeast-2)을 통해 처리됩니다.
                </p>
              </div>
            </section>

            {/* 제6조 - 개인정보의 파기 절차 및 방법 */}
            <section id="section6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제6조 (개인정보의 파기 절차 및 방법)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 원칙적으로 개인정보 처리목적이 달성된 경우에는 지체 없이 해당 개인정보를 파기합니다.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">1. 파기 절차</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>회원 탈퇴 요청 시 즉시 파기 (시스템 자동 처리)</li>
                    <li>법령에 따라 보관해야 하는 정보는 별도 데이터베이스에 격리 보관 후 보관 기간 만료 시 파기</li>
                    <li>파기 시 데이터 삭제 로그 생성 (감사 추적용)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">2. 파기 방법</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li><strong>전자적 파일:</strong> 기술적 방법을 사용하여 복구 불가능하도록 영구 삭제</li>
                    <li><strong>데이터베이스:</strong> DELETE 쿼리 + VACUUM 처리</li>
                    <li><strong>캐시 데이터:</strong> Redis DEL 명령어로 즉시 삭제</li>
                    <li><strong>종이 문서:</strong> 분쇄기를 이용한 파쇄 또는 소각 처리</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제7조 - 정보주체의 권리·의무 및 행사방법 */}
            <section id="section7">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제7조 (정보주체의 권리·의무 및 행사방법)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
              </p>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">1. 개인정보 열람 요구권 (제35조)</h3>
                  <p className="text-gray-700 text-sm">자신의 개인정보를 열람하거나 사본을 요구할 수 있습니다.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">2. 개인정보 정정·삭제 요구권 (제36조)</h3>
                  <p className="text-gray-700 text-sm">개인정보에 오류가 있는 경우 정정을 요구할 수 있습니다.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">3. 개인정보 처리정지 요구권 (제37조)</h3>
                  <p className="text-gray-700 text-sm">개인정보의 처리 정지를 요구할 수 있습니다. (단, 법령상 의무 이행 등 예외 사유 존재)</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">4. 개인정보 이동권 (제35조의2)</h3>
                  <p className="text-gray-700 text-sm">
                    자신의 개인정보를 CSV 형식으로 다운로드할 수 있습니다.
                    대시보드 &gt; 설정 &gt; 데이터 내보내기에서 이용 가능 (1시간에 1회 제한)
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-sm text-green-800">
                  <strong>권리 행사 방법:</strong> 대시보드 &gt; 설정 메뉴에서 직접 처리하거나,
                  이메일 (<a href="mailto:support@connectplt.kr" className="underline">support@connectplt.kr</a>)로 요청하실 수 있습니다.
                </p>
                <p className="text-sm text-green-800 mt-2">
                  <strong>처리 기한:</strong> 요청 접수 후 10일 이내 (개인정보 보호법 제35조 제5항)
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>이용 연령 제한:</strong> Connect는 만 14세 이상만 회원가입이 가능합니다.
                  만 14세 미만 아동의 법정대리인은 아동의 개인정보에 대한 권리를 행사할 수 있습니다.
                </p>
              </div>
            </section>

            {/* 제8조 - 개인정보의 안전성 확보 조치 */}
            <section id="section8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제8조 (개인정보의 안전성 확보 조치)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 「개인정보 보호법」 제29조에 따라 다음과 같은 안전성 확보 조치를 취하고 있습니다.
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">1. 개인정보 암호화</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li><strong>민감정보:</strong> 사업자등록번호는 AES-256-GCM 알고리즘으로 암호화하여 저장</li>
                    <li><strong>해싱:</strong> SHA-256 (검색 및 중복 확인용)</li>
                    <li><strong>통신 구간:</strong> HTTPS (TLS 1.3) 암호화</li>
                    <li><strong>데이터베이스:</strong> PostgreSQL 컬럼 레벨 암호화</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">2. 접근 통제</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>개인정보처리시스템에 대한 접근권한의 부여, 변경, 말소를 통한 접근통제</li>
                    <li>역할 기반 접근 제어 (RBAC): USER, ADMIN, SUPER_ADMIN 역할 분리</li>
                    <li>세션 관리: Redis 기반 세션 (30일 자동 만료)</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">3. 접속 기록 관리</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>개인정보처리시스템에 접속한 기록을 최소 1년 이상 보관 (일정 규모 이상 시 2년 이상)</li>
                    <li>서비스 방문 기록 (로그 기록, 접속 IP): 3개월 보관</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">4. 보안프로그램 설치 및 운영</h3>
                  <ul className="list-disc list-inside text-gray-600 text-sm space-y-1 ml-4">
                    <li>국내 최고 수준의 보안 프로그램 설치 및 운영</li>
                    <li>방화벽 및 침입 탐지 시스템 운영</li>
                    <li>실시간 보안 모니터링</li>
                    <li>월 1회 정기 취약점 점검</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 제9조 - 개인정보 보호책임자 */}
            <section id="section9">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제9조 (개인정보 보호책임자)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및
                피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-4">개인정보 보호책임자 (DPO)</h3>
                <dl className="space-y-2">
                  <div className="flex">
                    <dt className="w-24 font-medium text-gray-700">성명</dt>
                    <dd className="text-gray-900">김병진</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 font-medium text-gray-700">직책</dt>
                    <dd className="text-gray-900">대표 / 개인정보 보호책임자</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 font-medium text-gray-700">연락처</dt>
                    <dd className="text-gray-900">070-8778-2378</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 font-medium text-gray-700">이메일</dt>
                    <dd className="text-gray-900">
                      <a href="mailto:support@connectplt.kr" className="text-blue-600 hover:underline">
                        support@connectplt.kr
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* 제10조 - 권익침해 구제방법 */}
            <section id="section10">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제10조 (권익침해 구제방법)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원
                개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">한국인터넷진흥원 (KISA)</h3>
                  <p className="text-sm text-gray-700">전화: (국번 없이) 118</p>
                  <p className="text-sm text-gray-700">홈페이지: privacy.kisa.or.kr</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">개인정보 분쟁조정위원회</h3>
                  <p className="text-sm text-gray-700">전화: (국번 없이) 1833-6972</p>
                  <p className="text-sm text-gray-700">홈페이지: www.kopico.go.kr</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">대검찰청 사이버범죄수사단</h3>
                  <p className="text-sm text-gray-700">전화: (국번 없이) 1301</p>
                  <p className="text-sm text-gray-700">홈페이지: www.spo.go.kr</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">경찰청 사이버안전국</h3>
                  <p className="text-sm text-gray-700">전화: (국번 없이) 182</p>
                  <p className="text-sm text-gray-700">홈페이지: cyberbureau.police.go.kr</p>
                </div>
              </div>
            </section>

            {/* 제11조 - 개인정보 처리방침의 변경 */}
            <section id="section11">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                제11조 (개인정보 처리방침의 변경)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                이 개인정보 처리방침은 2025년 11월 20일부터 적용됩니다.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>일반적인 변경사항: 시행 <strong>7일 전</strong>부터 공지사항을 통하여 고지</li>
                <li>중요한 변경사항 (개인정보 수집 항목 추가, 제3자 제공 등): 시행 <strong>30일 전</strong> 이메일 또는 대시보드 팝업으로 개별 통지</li>
              </ul>

              <h3 className="font-bold text-gray-900 mb-3">버전 이력</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left">버전</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">시행일자</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">주요 변경 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">1.0</td>
                      <td className="border border-gray-300 px-4 py-2">2025-11-20</td>
                      <td className="border border-gray-300 px-4 py-2">최초 제정 (PIPA 준수 개인정보 처리방침)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        </div>

        {/* Back to Home Button - Same style as Terms of Service */}
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
