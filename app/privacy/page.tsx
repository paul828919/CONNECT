/**
 * Privacy Policy Page (개인정보처리방침)
 * PIPA-compliant privacy policy for OAuth certification
 */

import Link from 'next/link';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
            <Shield className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">개인정보처리방침</h1>
              <p className="text-sm text-gray-500 mt-1">Privacy Policy</p>
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
                Connect(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고
                이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
              </p>
              <p className="text-sm text-gray-600 italic">
                Connect (the "Company") establishes and discloses this Privacy Policy in accordance with Article 30
                of the Personal Information Protection Act to protect the personal information of data subjects and
                to promptly and smoothly handle related grievances.
              </p>
            </section>

            {/* Section 1: Collection */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제1조 (개인정보의 처리 목적)
              </h2>
              <p className="mb-2 font-semibold">회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li><strong>회원 가입 및 관리:</strong> 카카오/네이버 OAuth 소셜 로그인, 회원제 서비스 제공, 본인확인</li>
                <li><strong>서비스 제공:</strong> R&D 펀딩 매칭, 조직 프로필 관리, 맞춤형 매칭 알고리즘</li>
                <li><strong>마케팅 및 광고:</strong> 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 1 (Purpose of Processing Personal Information)</strong><br />
                The Company processes personal information for the following purposes:
                (1) Membership registration and management via Kakao/Naver OAuth social login;
                (2) Service provision including R&D funding matching and organization profile management;
                (3) Marketing and advertising for new services and events.
              </p>
            </section>

            {/* Section 2: Items Collected */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제2조 (처리하는 개인정보의 항목)
              </h2>
              <p className="mb-2 font-semibold">회사는 다음의 개인정보 항목을 처리하고 있습니다:</p>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-gray-900 mb-2">1. 카카오 OAuth 소셜 로그인</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>필수항목: 이메일 주소, 프로필 닉네임, 프로필 이미지</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-gray-900 mb-2">2. 네이버 OAuth 소셜 로그인</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>필수항목: 이메일 주소, 프로필 닉네임, 프로필 이미지</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-gray-900 mb-2">3. 조직 프로필 정보</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>필수항목: 조직명, 사업자등록번호 (AES-256-GCM 암호화), 산업 분야, 직원 수</li>
                  <li>선택항목: 조직 설명, R&D 경험, TRL 레벨, 인증서 정보</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="font-bold text-gray-900 mb-2">4. 서비스 이용 과정에서 자동 수집되는 정보</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>IP 주소, 쿠키, 서비스 이용 기록, 방문 일시</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 italic mt-4">
                <strong>Article 2 (Items of Personal Information Collected)</strong><br />
                The Company collects: (1) Email, nickname, and profile image from Kakao/Naver OAuth;
                (2) Organization name, business registration number (AES-256-GCM encrypted), industry sector, and employee count;
                (3) Automatically collected information including IP address, cookies, service usage records.
              </p>
            </section>

            {/* Section 3: Retention Period */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제3조 (개인정보의 처리 및 보유 기간)
              </h2>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우 해당 조사 종료 시까지)</li>
                <li><strong>서비스 이용 기록:</strong> 3년 (통신비밀보호법)</li>
                <li><strong>소비자 불만 또는 분쟁 처리 기록:</strong> 3년 (전자상거래법)</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 3 (Retention Period of Personal Information)</strong><br />
                Member information is retained until account deletion. Service usage records are kept for 3 years
                in accordance with the Communications Secrets Protection Act.
              </p>
            </section>

            {/* Section 4: Encryption */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제4조 (개인정보의 안전성 확보 조치)
              </h2>
              <p className="mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li><strong>암호화:</strong> 사업자등록번호는 AES-256-GCM 알고리즘으로 암호화하여 저장</li>
                <li><strong>접근 통제:</strong> 개인정보처리시스템에 대한 접근권한의 부여, 변경, 말소를 통한 접근통제</li>
                <li><strong>접속 기록 관리:</strong> 개인정보처리시스템에 접속한 기록을 최소 1년 이상 보관</li>
                <li><strong>보안프로그램 설치:</strong> 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안프로그램 설치 및 주기적 업데이트</li>
              </ol>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 4 (Security Measures for Personal Information)</strong><br />
                The Company implements: (1) AES-256-GCM encryption for business registration numbers;
                (2) Access control to personal information processing systems;
                (3) Maintenance of access logs for at least 1 year;
                (4) Installation and regular updates of security programs.
              </p>
            </section>

            {/* Section 5: Third-Party Sharing */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제5조 (개인정보의 제3자 제공)
              </h2>
              <p className="mb-4">
                회사는 원칙적으로 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며,
                정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만
                개인정보를 제3자에게 제공합니다.
              </p>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 5 (Provision of Personal Information to Third Parties)</strong><br />
                The Company only provides personal information to third parties with the consent of the data subject
                or in cases specified in Articles 17 and 18 of the Personal Information Protection Act.
              </p>
            </section>

            {/* Section 6: Rights */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제6조 (정보주체의 권리·의무 및 행사방법)
              </h2>
              <p className="mb-2">정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
              <ol className="list-decimal list-inside space-y-2 mb-4">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리정지 요구</li>
              </ol>
              <p className="mb-4">
                권리 행사는 회사에 대해 서면, 전화, 전자우편 등을 통하여 하실 수 있으며,
                회사는 이에 대해 지체 없이 조치하겠습니다.
              </p>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 6 (Rights and Exercise Methods of Data Subjects)</strong><br />
                Data subjects may exercise their rights including access, correction, deletion, and suspension of
                personal information processing at any time through written requests, phone calls, or email.
              </p>
            </section>

            {/* Section 7: Contact */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제7조 (개인정보 보호책임자)
              </h2>
              <p className="mb-4">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및
                피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:
              </p>
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-3">개인정보 보호책임자</h3>
                <ul className="space-y-2">
                  <li><strong>성명:</strong> 김병진 (Paul Kim)</li>
                  <li><strong>직책:</strong> 대표</li>
                  <li><strong>연락처:</strong> 추후 공개 예정</li>
                  <li><strong>이메일:</strong> 추후 공개 예정</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 italic mt-4">
                <strong>Article 7 (Personal Information Protection Officer)</strong><br />
                Name: Paul Kim (CEO) | Contact details to be disclosed after beta launch.
              </p>
            </section>

            {/* Section 8: Changes */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                제8조 (개인정보 처리방침의 변경)
              </h2>
              <p className="mb-4">
                이 개인정보 처리방침은 2025년 1월 1일부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
                변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
              </p>
              <p className="text-sm text-gray-600 italic">
                <strong>Article 8 (Changes to Privacy Policy)</strong><br />
                This Privacy Policy is effective from January 1, 2025. Any changes will be announced
                at least 7 days prior to implementation.
              </p>
            </section>

            {/* Footer Note */}
            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                본 개인정보처리방침은 Connect 베타 서비스 출시를 위한 초안이며,
                정식 서비스 출시 시 법률 자문을 거쳐 최종 확정됩니다.
              </p>
              <p className="text-sm text-gray-500 mt-2 italic">
                This Privacy Policy is a draft for Connect's beta service launch and will be finalized
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
