/**
 * Payment Confirmation Email Template
 *
 * Sent when a payment is successfully processed.
 * Includes refund policy summary for KFTC compliance (Phase 7c).
 */

import { baseEmailTemplate } from './base';
import { emailBaseUrl } from '../config';

export interface PaymentConfirmationEmailProps {
  userName: string;
  userEmail: string;
  organizationName: string;
  plan: 'PRO' | 'TEAM';
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amount: number; // in KRW
  paymentDate: Date;
  nextBillingDate: Date;
  subscriptionUrl?: string;
  refundPolicyUrl?: string;
}

export function generatePaymentConfirmationEmail({
  userName,
  organizationName,
  plan,
  billingCycle,
  amount,
  paymentDate,
  nextBillingDate,
  subscriptionUrl = `${emailBaseUrl}/dashboard/subscription`,
  refundPolicyUrl = `${emailBaseUrl}/refund-policy`,
}: PaymentConfirmationEmailProps): string {
  const planName = plan === 'PRO' ? 'Pro' : 'Team';
  const billingCycleName = billingCycle === 'MONTHLY' ? '월간' : '연간';
  const formattedAmount = amount.toLocaleString('ko-KR');
  const formattedPaymentDate = paymentDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedNextBillingDate = nextBillingDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        ✅ 결제가 완료되었습니다
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        안녕하세요 ${userName}님,<br/>
        <strong>${organizationName}</strong>의 Connect ${planName} 플랜 결제가 정상적으로 처리되었습니다.
      </p>
    </div>

    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        📄 결제 내역
      </h3>

      <table style="width: 100%; font-size: 14px; color: #4b5563; line-height: 1.8;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #111827; width: 40%;">플랜</td>
          <td style="padding: 8px 0;">${planName} (${billingCycleName})</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #111827;">결제 금액</td>
          <td style="padding: 8px 0; font-size: 16px; font-weight: 700; color: #2563eb;">₩${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #111827;">결제일</td>
          <td style="padding: 8px 0;">${formattedPaymentDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600; color: #111827;">다음 결제 예정일</td>
          <td style="padding: 8px 0;">${formattedNextBillingDate}</td>
        </tr>
      </table>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${subscriptionUrl}" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        구독 관리하기
      </a>
    </div>

    <div style="margin: 32px 0; padding-top: 24px; border-top: 2px solid #e5e7eb;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        🔄 환불 정책 안내
      </h3>

      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
        <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px;">
          1️⃣ 법정 청약철회 (7일 이내, 전액 환불)
        </p>
        <p style="font-size: 14px; color: #1e40af; line-height: 1.6; margin: 0;">
          결제일로부터 <strong>7일 이내</strong>에는 전자상거래법 제17조에 따라 <strong>전액 환불</strong>이 가능합니다.
        </p>
      </div>

      <div style="background-color: #f9fafb; border-left: 4px solid #6b7280; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
        <p style="font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 8px;">
          2️⃣ 약관 환불 (7일 경과 후)
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 8px 0 0; padding-left: 20px; line-height: 1.6;">
          ${billingCycle === 'ANNUAL'
            ? `<li><strong>연간 플랜</strong>: 사용 기간 일할 계산 + 잔여 금액의 10% 위약금 차감</li>
               <li>예시: 365일 중 30일 사용 시, 미사용 335일분 환불 (위약금 10% 차감)</li>`
            : `<li><strong>월간 플랜</strong>: 7일 경과 시 당월 환불 불가 (차월부터 과금 중지)</li>
               <li>구독 해지 시 다음 결제일부터 자동 과금 중지</li>`
          }
        </ul>
      </div>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
        <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">
          3️⃣ 사업자 귀책 사유 (위약금 없음)
        </p>
        <p style="font-size: 14px; color: #92400e; line-height: 1.6; margin: 0;">
          서비스 장애, 빌링 오류, 중복 결제 등 Connect의 귀책 사유인 경우 <strong>위약금 없이 사용 기간 일할 계산 후 환불</strong>됩니다.
        </p>
      </div>

      <p style="font-size: 13px; color: #6b7280; line-height: 1.6; margin: 16px 0 0;">
        📌 환불 처리: 영업일 기준 3일 이내 (전자상거래법 제18조)<br/>
        📌 결제 취소 시 PG사 정책에 따라 영업일 2-5일 소요될 수 있습니다.
      </p>

      <div style="margin: 20px 0; text-align: center;">
        <a href="${refundPolicyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #f3f4f6; color: #374151 !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; border: 1px solid #d1d5db;">
          전체 환불 정책 보기
        </a>
      </div>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        📞 구독 관리 안내
      </h3>
      <div style="font-size: 14px; color: #4b5563; line-height: 1.8;">
        <p style="margin: 0 0 12px;">
          <strong>구독 해지</strong>: <a href="${subscriptionUrl}" style="color: #2563eb; text-decoration: none;">구독 관리 페이지</a>에서 언제든지 해지 가능 (다음 결제일부터 과금 중지)
        </p>
        <p style="margin: 0 0 12px;">
          <strong>환불 요청</strong>: <a href="${subscriptionUrl}" style="color: #2563eb; text-decoration: none;">구독 관리 페이지</a>에서 환불 신청 또는 <a href="mailto:support@connectplt.kr" style="color: #2563eb; text-decoration: none;">support@connectplt.kr</a>로 문의
        </p>
        <p style="margin: 0 0 12px;">
          <strong>고객지원</strong>: 영업일 기준 1일 이내 응답 보장
        </p>
      </div>
    </div>

    <div style="margin: 32px 0; text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
      <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 8px;">
        🎉 Connect로 더 많은 R&D 기회를 발견하세요!
      </p>
      <p style="font-size: 14px; color: #15803d; margin: 0; line-height: 1.6;">
        AI 기반 매칭으로 귀사에 딱 맞는 정부 R&D 과제를 찾아드립니다.<br/>
        ${userName}님의 성공적인 R&D 여정을 응원합니다! 🚀
      </p>
    </div>
  `;

  return baseEmailTemplate({
    title: 'Connect 결제 완료',
    preheader: `${planName} 플랜 결제가 완료되었습니다. 금액: ₩${formattedAmount} | 다음 결제일: ${formattedNextBillingDate}`,
    content,
  });
}

/**
 * Example usage:
 *
 * ```typescript
 * import { generatePaymentConfirmationEmail } from '@/lib/email/templates/payment-confirmation';
 * import { sendEmail } from '@/lib/email/utils';
 *
 * const htmlContent = generatePaymentConfirmationEmail({
 *   userName: '김철수',
 *   userEmail: 'kim@example.com',
 *   organizationName: 'ABC테크놀로지',
 *   plan: 'PRO',
 *   billingCycle: 'ANNUAL',
 *   amount: 490000,
 *   paymentDate: new Date('2025-11-22'),
 *   nextBillingDate: new Date('2026-11-22'),
 * });
 *
 * await sendEmail({
 *   to: 'kim@example.com',
 *   subject: 'Connect 결제가 완료되었습니다 ✅',
 *   html: htmlContent,
 * });
 * ```
 */
