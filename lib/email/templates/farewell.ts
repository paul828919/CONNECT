/**
 * Farewell Email Template (PIPA Compliance)
 *
 * Sent to users after successful account deletion.
 * Confirms deletion, lists deleted data types, and warns about re-registration restrictions.
 *
 * PIPA Article 21: Users have the right to request deletion of personal information.
 * This email confirms exercise of that right and provides deletion audit trail.
 */

import { baseEmailTemplate } from './base';
import { emailBaseUrl } from '../config';

export interface FarewellEmailProps {
  userName: string;
  userEmail: string;
  deletionDate: string; // ISO 8601 format: "2025-01-20T15:30:00.000Z"
  organizationName?: string;
}

export function generateFarewellEmail({
  userName,
  userEmail,
  deletionDate,
  organizationName,
}: FarewellEmailProps): string {
  const formattedDate = new Date(deletionDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  });

  const content = `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        👋 Connect 회원 탈퇴가 완료되었습니다
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        안녕하세요 ${userName}님,<br/>
        ${organizationName ? `<strong>${organizationName}</strong>의 ` : ''}Connect 서비스를 이용해 주셔서 진심으로 감사합니다.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin: 12px 0 0;">
        탈퇴 완료 일시: <strong>${formattedDate} (KST)</strong>
      </p>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; font-weight: 600; color: #991b1b; margin: 0 0 8px;">
        ⚠️ 중요: 삭제된 데이터는 복구할 수 없습니다
      </p>
      <p style="font-size: 14px; color: #991b1b; line-height: 1.6; margin: 0;">
        아래 데이터는 즉시 완전히 삭제되었으며, Connect 서비스 약관 및 개인정보 처리방침(PIPA)에 따라 복구가 불가능합니다.
      </p>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        🗂️ 삭제된 개인정보 및 서비스 데이터
      </h3>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          1️⃣ 계정 및 개인정보
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>이름, 이메일 주소</li>
          <li>OAuth 연동 정보 (카카오/네이버)</li>
          <li>로그인 세션 정보</li>
          <li>프로필 사진 (있는 경우)</li>
        </ul>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          2️⃣ 조직 정보 및 프로필
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>조직명, 사업자등록번호 (암호화 데이터)</li>
          <li>산업 분야, TRL 수준, 보유 인증</li>
          <li>연간 매출, R&D 경험, 기술 키워드</li>
          <li>조직 설명 및 메모</li>
        </ul>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          3️⃣ 매칭 및 과제 데이터
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>AI 생성 매칭 결과 (최대 10개 과제)</li>
          <li>매칭 점수 및 이유 설명</li>
          <li>저장한 과제 북마크</li>
          <li>과제 관련 Q&A 챗봇 대화 기록</li>
        </ul>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          4️⃣ 컨소시엄 및 메시지
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>참여 중인 컨소시엄 멤버십</li>
          <li>보낸/받은 협업 제안 메시지</li>
          <li>파트너 검색 기록</li>
          <li>협업 요청 상태 정보</li>
        </ul>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          5️⃣ 결제 및 구독 정보
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Toss Payments 구독 정보 (자동 결제 취소됨)</li>
          <li>결제 내역 및 영수증</li>
          <li>구독 플랜 히스토리</li>
        </ul>
      </div>
    </div>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">
        🔒 PIPA 준수: 보관되는 정보
      </p>
      <p style="font-size: 14px; color: #92400e; line-height: 1.6; margin: 0 0 12px;">
        개인정보 보호법(PIPA) 제31조에 따라 <strong>3년간 보관되는 감사 로그</strong>:
      </p>
      <ul style="font-size: 13px; color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>데이터 다운로드 요청 기록</li>
        <li>회원 탈퇴 요청 및 완료 시각</li>
        <li>구독 취소 처리 기록</li>
      </ul>
      <p style="font-size: 13px; color: #92400e; line-height: 1.6; margin: 12px 0 0;">
        감사 로그는 <strong>익명화된 형태</strong>로 보관되며, 개인 식별 정보는 포함되지 않습니다. 3년 후 자동으로 완전히 삭제됩니다.
      </p>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; font-weight: 600; color: #991b1b; margin: 0 0 8px;">
        ⚠️ 재가입 제한 정책
      </p>
      <p style="font-size: 14px; color: #991b1b; line-height: 1.6; margin: 0;">
        탈퇴한 계정과 동일한 이메일 주소(<strong>${userEmail}</strong>)로 <strong>재가입이 불가능</strong>합니다. 이는 PIPA 준수 및 서비스 무결성 보호를 위한 조치입니다. 재가입을 원하시는 경우 다른 이메일 주소를 사용해 주세요.
      </p>
    </div>

    <div style="margin: 32px 0; padding: 24px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #86efac;">
      <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 12px; text-align: center;">
        💚 Connect를 이용해 주셔서 감사합니다
      </p>
      <p style="font-size: 14px; color: #15803d; line-height: 1.8; margin: 0; text-align: center;">
        ${userName}님의 R&D 여정에 함께할 수 있어 영광이었습니다.<br/>
        앞으로도 귀사의 혁신과 성장을 응원하겠습니다. 🚀
      </p>
    </div>

    <div style="margin: 32px 0; padding-top: 24px; border-top: 2px solid #e5e7eb;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        📞 문의 및 지원
      </h3>
      <div style="font-size: 14px; color: #4b5563; line-height: 1.8;">
        <p style="margin: 0 0 8px;">
          탈퇴 처리 관련 문의사항이 있으시거나 서비스 개선 제안을 주시려면 언제든지 연락 주세요.
        </p>
        <p style="margin: 12px 0 0;">
          <strong>고객지원 이메일</strong>: <a href="mailto:support@connectplt.kr" style="color: #2563eb; text-decoration: none;">support@connectplt.kr</a>
        </p>
        <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">
          (답변: 영업일 기준 24시간 이내)
        </p>
      </div>
    </div>

    <div style="margin: 24px 0 0; padding: 16px; background-color: #f9fafb; border-radius: 6px; text-align: center;">
      <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 0;">
        이 이메일은 회원 탈퇴 완료를 확인하는 자동 발송 이메일입니다.<br/>
        Connect 서비스 재가입을 원하시는 경우 다른 이메일 주소로 신규 가입해 주세요.
      </p>
    </div>
  `;

  return baseEmailTemplate({
    title: 'Connect 회원 탈퇴 완료',
    preheader: `${userName}님의 Connect 계정이 완전히 삭제되었습니다. 그동안 Connect를 이용해 주셔서 감사합니다.`,
    content,
  });
}

/**
 * Example usage:
 *
 * ```typescript
 * import { generateFarewellEmail } from '@/lib/email/templates/farewell';
 * import { sendEmail } from '@/lib/email/utils';
 *
 * const htmlContent = generateFarewellEmail({
 *   userName: '김철수',
 *   userEmail: 'kim@example.com',
 *   deletionDate: new Date().toISOString(),
 *   organizationName: 'ABC테크놀로지',
 * });
 *
 * await sendEmail({
 *   to: 'kim@example.com',
 *   subject: 'Connect 회원 탈퇴 완료 안내',
 *   html: htmlContent,
 * });
 * ```
 */
