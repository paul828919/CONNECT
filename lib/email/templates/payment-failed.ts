/**
 * Payment Failed Email Template
 *
 * Sent when a recurring payment fails.
 * Includes retry schedule and payment method update instructions.
 */

import { baseEmailTemplate } from './base';
import { emailBaseUrl } from '../config';

export interface PaymentFailedEmailProps {
  userName: string;
  userEmail: string;
  organizationName: string;
  plan: 'PRO' | 'TEAM';
  amount: number; // in KRW
  failureReason: string;
  retryCount: number;
  nextRetryDate?: Date;
  updatePaymentUrl?: string;
}

export function generatePaymentFailedEmail({
  userName,
  organizationName,
  plan,
  amount,
  failureReason,
  retryCount,
  nextRetryDate,
  updatePaymentUrl = `${emailBaseUrl}/dashboard/billing/update`,
}: PaymentFailedEmailProps): string {
  const planName = plan === 'PRO' ? 'Pro' : 'Team';
  const formattedAmount = amount.toLocaleString('ko-KR');

  const formattedNextRetryDate = nextRetryDate
    ? nextRetryDate.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  // Retry schedule explanation
  const retryScheduleText =
    retryCount === 0
      ? '1일 후 1차 재시도'
      : retryCount === 1
        ? '3일 후 2차 재시도'
        : retryCount === 2
          ? '7일 후 3차(최종) 재시도'
          : '모든 재시도 완료 - 구독이 일시 중단됩니다';

  const isLastRetry = retryCount >= 3;

  const content = `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #dc2626; margin: 0 0 16px;">
        ⚠️ 결제 처리에 실패했습니다
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        안녕하세요 ${userName}님,<br/>
        <strong>${organizationName}</strong>의 Connect ${planName} 플랜 자동 결제가 실패했습니다.
      </p>
    </div>

    <div style="background-color: #fef2f2; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #fecaca;">
      <h3 style="font-size: 18px; font-weight: 600; color: #991b1b; margin: 0 0 16px;">
        📄 결제 실패 정보
      </h3>

      <table style="width: 100%; font-size: 14px; color: #7f1d1d; line-height: 1.8;">
        <tr>
          <td style="padding: 8px 0; font-weight: 600; width: 40%;">플랜</td>
          <td style="padding: 8px 0;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">결제 금액</td>
          <td style="padding: 8px 0;">₩${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">실패 사유</td>
          <td style="padding: 8px 0;">${failureReason}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">재시도 횟수</td>
          <td style="padding: 8px 0;">${retryCount}회 / 3회</td>
        </tr>
        ${
          formattedNextRetryDate
            ? `
        <tr>
          <td style="padding: 8px 0; font-weight: 600;">다음 재시도 예정</td>
          <td style="padding: 8px 0;">${formattedNextRetryDate} (${retryScheduleText})</td>
        </tr>
        `
            : ''
        }
      </table>
    </div>

    ${
      isLastRetry
        ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">
        ⚠️ 구독 일시 중단 예정
      </p>
      <p style="font-size: 14px; color: #92400e; line-height: 1.6; margin: 0;">
        모든 재시도가 실패하여 구독이 일시 중단됩니다. 서비스를 계속 이용하시려면 결제 수단을 업데이트해 주세요.
      </p>
    </div>
    `
        : `
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; font-weight: 600; color: #1e40af; margin: 0 0 8px;">
        🔄 자동 재시도 안내
      </p>
      <p style="font-size: 14px; color: #1e40af; line-height: 1.6; margin: 0;">
        Connect는 결제 실패 시 <strong>자동으로 재시도</strong>합니다.<br/>
        • 1차 재시도: 결제 실패 1일 후<br/>
        • 2차 재시도: 1차 실패 3일 후<br/>
        • 3차 재시도(최종): 2차 실패 7일 후
      </p>
    </div>
    `
    }

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        💳 결제 수단을 확인해 주세요
      </h3>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 16px;">
        다음과 같은 이유로 결제가 실패할 수 있습니다:
      </p>
      <ul style="font-size: 14px; color: #4b5563; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>카드 만료</strong>: 등록된 카드의 유효기간이 지났습니다.</li>
        <li><strong>잔액 부족</strong>: 카드 결제 한도 또는 계좌 잔액이 부족합니다.</li>
        <li><strong>카드 정지</strong>: 카드사에서 카드를 일시 정지했습니다.</li>
        <li><strong>해외 결제 차단</strong>: 해외 결제가 차단된 카드입니다.</li>
      </ul>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${updatePaymentUrl}" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        결제 수단 변경하기
      </a>
      <p style="font-size: 13px; color: #6b7280; margin: 12px 0 0;">
        새 카드를 등록하면 즉시 결제가 다시 시도됩니다.
      </p>
    </div>

    <div style="margin: 32px 0; padding-top: 24px; border-top: 2px solid #e5e7eb;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        📞 도움이 필요하신가요?
      </h3>
      <div style="font-size: 14px; color: #4b5563; line-height: 1.8;">
        <p style="margin: 0 0 12px;">
          결제 관련 문의는 <a href="mailto:support@connectplt.kr" style="color: #2563eb; text-decoration: none;">support@connectplt.kr</a>로 연락해 주세요.
        </p>
        <p style="margin: 0 0 12px;">
          영업일 기준 1일 이내 응답 보장
        </p>
      </div>
    </div>
  `;

  return baseEmailTemplate({
    title: 'Connect 결제 실패 안내',
    preheader: `${planName} 플랜 자동 결제가 실패했습니다. 결제 수단을 확인해 주세요.`,
    content,
  });
}
