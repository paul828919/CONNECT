/**
 * Terms of Service Page (이용약관)
 * Service terms for OAuth certification
 */

import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            ← Connect
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          {/* Title */}
          <div className="flex items-center gap-3 mb-8">
            <FileText className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">이용약관</h1>
              <p className="text-sm text-gray-500 mt-1">Terms of Service</p>
            </div>
          </div>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            {/* Last Updated */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
              <p className="text-sm font-semibold text-blue-900">
                시행일: 2025년 1월 1일 | Effective Date: January 1, 2025
              </p>
            </div>

            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">서문</h2>
              <p className="mb-4">
                본 약관은 Connect(이하 &quot;회사&quot;)가 제공하는 R&D 펀딩 매칭 플랫폼 서비스(이하 &quot;서비스&quot;)의
                이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항 및 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
              <p className="text-sm text-gray-600 italic">
                These Terms of Service govern the use of Connect&apos;s R&D funding matching platform service,
                including conditions, procedures, rights, obligations, and responsibilities of users and the Company.
              </p>
            </section>

            {/* Article 1: Definitions */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제1조 (용어의 정의)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li><strong>&quot;서비스&quot;</strong>란 회사가 제공하는 R&D 펀딩 프로그램 매칭, 조직 프로필 관리, 매칭 결과 제공 등 일체의 서비스를 의미합니다.</li>
                <li><strong>&quot;회원&quot;</strong>이란 회사의 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.</li>
                <li><strong>&quot;소셜 로그인&quot;</strong>이란 카카오, 네이버 등의 OAuth 인증 방식을 통해 서비스에 가입 및 로그인하는 것을 의미합니다.</li>
                <li><strong>&quot;조직 프로필&quot;</strong>이란 회원이 등록한 기업, 대학, 연구소 등의 정보를 의미합니다.</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 1 (Definitions)</strong><br />
                &quot;Service&quot; means all services provided by the Company including R&D funding matching and organization profile management.
                &quot;Member&quot; means a customer who accesses the Service and enters into a user agreement with the Company.
                &quot;Social Login&quot; means signing up and logging in via OAuth authentication (Kakao, Naver).
              </p>
            </section>

            {/* Article 2: Effect and Amendment */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제2조 (약관의 효력 및 변경)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을 발생합니다.</li>
                <li>회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위 안에서 본 약관을 변경할 수 있으며, 약관이 변경되는 경우 변경 사항 및 적용 일자를 명시하여 현행 약관과 함께 서비스 초기 화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
                <li>회원은 변경된 약관에 대해 거부할 권리가 있습니다. 회원은 변경된 약관이 공지된 후 15일 이내에 거부 의사를 표명할 수 있습니다. 회원이 거부하는 경우 회사는 해당 회원과의 계약을 해지할 수 있습니다.</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 2 (Effect and Amendment of Terms)</strong><br />
                These Terms become effective upon posting on the Service. The Company may amend the Terms with
                reasonable cause, notifying members at least 7 days in advance. Members have the right to refuse
                amended Terms within 15 days of notice.
              </p>
            </section>

            {/* Article 3: Service Registration */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제3조 (서비스 이용 신청)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>서비스 이용을 희망하는 자는 회사가 정한 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
                <li>회원가입은 카카오 또는 네이버 소셜 로그인을 통해 이루어지며, 회사는 OAuth 제공자로부터 받은 정보(이메일, 닉네임, 프로필 이미지)를 활용하여 회원을 식별합니다.</li>
                <li>회사는 다음 각 호에 해당하는 경우 회원가입 신청을 승낙하지 않거나 사후에 이용계약을 해지할 수 있습니다:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>타인의 명의를 이용한 경우</li>
                    <li>허위의 정보를 기재하거나, 회사가 제시하는 내용을 기재하지 않은 경우</li>
                    <li>관계 법령에 위배되거나 사회의 안녕질서 혹은 미풍양속을 저해할 목적으로 신청한 경우</li>
                  </ul>
                </li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 3 (Application for Service Use)</strong><br />
                Membership is established through Kakao or Naver social login. The Company may refuse or terminate
                membership for: (1) use of another person&apos;s name; (2) providing false information;
                (3) violating related laws or public order.
              </p>
            </section>

            {/* Article 4: Service Provision */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제4조 (서비스의 제공 및 변경)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>회사는 다음과 같은 서비스를 제공합니다:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>R&D 펀딩 프로그램 정보 수집 및 매칭</li>
                    <li>조직 프로필 관리 (기업/대학/연구소)</li>
                    <li>맞춤형 매칭 알고리즘 제공</li>
                    <li>매칭 결과 열람 및 알림</li>
                    <li>기타 회사가 정하는 서비스</li>
                  </ul>
                </li>
                <li>회사는 서비스의 품질 향상을 위해 서비스의 내용을 변경할 수 있으며, 중대한 변경이 있는 경우 사전에 공지합니다.</li>
                <li>회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>서비스용 설비의 보수 등 공사로 인한 부득이한 경우</li>
                    <li>전기통신사업법에 규정된 기간통신사업자가 전기통신 서비스를 중지했을 경우</li>
                    <li>국가비상사태, 정전, 서비스 설비의 장애 또는 서비스 이용의 폭주 등으로 서비스 이용에 지장이 있는 경우</li>
                  </ul>
                </li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 4 (Provision and Modification of Service)</strong><br />
                The Company provides R&D funding matching, organization profile management, and matching algorithm services.
                Services may be modified for quality improvement or suspended due to maintenance, telecommunications
                disruption, or force majeure events.
              </p>
            </section>

            {/* Article 5: Data Use */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제5조 (데이터의 이용 및 보안)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>회사는 회원이 입력한 조직 프로필 정보를 매칭 알고리즘에 활용하여 적합한 R&D 펀딩 프로그램을 추천합니다.</li>
                <li>회원의 사업자등록번호는 AES-256-GCM 알고리즘으로 암호화되어 저장되며, 「개인정보 보호법」에 따라 안전하게 관리됩니다.</li>
                <li>회사는 회원의 개인정보를 본인의 승낙 없이 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>법령의 규정에 의하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                  </ul>
                </li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 5 (Data Use and Security)</strong><br />
                Organization profile information is used for matching algorithms. Business registration numbers are
                encrypted with AES-256-GCM. Personal information is not provided to third parties without consent,
                except as required by law or lawful investigation.
              </p>
            </section>

            {/* Article 6: Member Obligations */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제6조 (회원의 의무)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>회원은 다음 행위를 하여서는 안 됩니다:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>신청 또는 변경 시 허위 내용의 등록</li>
                    <li>타인의 정보 도용</li>
                    <li>회사가 게시한 정보의 변경</li>
                    <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                    <li>회사 및 제3자의 저작권 등 지적재산권에 대한 침해</li>
                    <li>회사 및 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                    <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                  </ul>
                </li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 6 (Member Obligations)</strong><br />
                Members must not: (1) register false information; (2) misappropriate others&apos; information;
                (3) infringe intellectual property rights; (4) damage reputation or interfere with business;
                (5) post obscene or violent content violating public order.
              </p>
            </section>

            {/* Article 7: Service Charges */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제7조 (서비스 이용요금)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>회사가 제공하는 서비스는 기본적으로 무료입니다. 다만, 회사는 유료 서비스를 제공할 수 있으며, 이 경우 해당 서비스 이용 전에 이용요금을 명시합니다.</li>
                <li>유료 서비스 이용요금의 결제는 회사가 정한 방법(신용카드, 계좌이체 등)을 통해 이루어집니다.</li>
                <li>유료 서비스를 이용한 회원이 결제한 이용요금은 환불이 불가능합니다. 다만, 다음 각 호의 경우는 예외로 합니다:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li>서비스의 장애 또는 결함으로 인해 서비스를 이용하지 못한 경우</li>
                    <li>회사의 귀책사유로 계약 내용과 다르게 서비스가 제공된 경우</li>
                  </ul>
                </li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 7 (Service Charges)</strong><br />
                Basic services are free. Paid services may be offered with fees disclosed in advance.
                Payment is made through designated methods (credit card, bank transfer). Refunds are not available
                except for service failures or Company liability.
              </p>
            </section>

            {/* Article 8: Liability */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제8조 (면책 조항)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 대한 책임이 면제됩니다.</li>
                <li>회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대하여 책임을 지지 않습니다.</li>
                <li>회사는 회원이 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관해서는 책임을 지지 않습니다.</li>
                <li>회사가 제공하는 매칭 서비스는 정보 제공 목적이며, 실제 R&D 프로그램 선정 결과에 대해서는 책임을 지지 않습니다.</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 8 (Disclaimer)</strong><br />
                The Company is not liable for: (1) force majeure events preventing service provision;
                (2) service disruptions due to member&apos;s fault; (3) member&apos;s failure to obtain expected profits;
                (4) reliability or accuracy of member-posted content; (5) actual R&D program selection results.
                The matching service is for informational purposes only.
              </p>
            </section>

            {/* Article 9: Dispute Resolution */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제9조 (분쟁 해결)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>회사는 회원으로부터 제출되는 불만사항 및 의견을 우선적으로 처리합니다. 다만, 신속한 처리가 곤란한 경우에는 회원에게 그 사유와 처리일정을 즉시 통보해 드립니다.</li>
                <li>본 약관은 대한민국 법령에 의하여 규정되고 이행되며, 서비스 이용과 관련하여 회사와 회원 간에 발생한 분쟁에 대해서는 대한민국 법을 적용합니다.</li>
                <li>서비스 이용으로 발생한 분쟁에 대해 소송이 제기될 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 9 (Dispute Resolution)</strong><br />
                The Company prioritizes handling member complaints and opinions. These Terms are governed by
                the laws of the Republic of Korea. Disputes shall be subject to the jurisdiction of the court
                having jurisdiction over the Company&apos;s principal office location.
              </p>
            </section>

            {/* Footer Note */}
            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                본 이용약관은 Connect 베타 서비스 출시를 위한 초안이며,
                정식 서비스 출시 시 법률 자문을 거쳐 최종 확정됩니다.
              </p>
              <p className="text-sm text-gray-500 mt-2 italic">
                These Terms of Service are a draft for Connect&apos;s beta service launch and will be finalized
                with legal consultation before official service launch.
              </p>
            </div>
          </div>

          {/* Back to Home Button */}
          <div className="mt-8 pt-6 border-t">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기 (Back to Home)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
