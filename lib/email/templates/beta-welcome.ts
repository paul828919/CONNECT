/**
 * Beta User Welcome Email Template
 *
 * Sent to new beta users upon registration.
 * Introduces platform features, AI capabilities, and provides quick start guide.
 */

import { baseEmailTemplate } from './base';
import { emailBaseUrl } from '../config';

export interface BetaWelcomeEmailProps {
  userName: string;
  userEmail: string;
  organizationName: string;
  betaUserNumber: number; // e.g., 1-50
  dashboardUrl?: string;
  feedbackUrl?: string;
}

export function generateBetaWelcomeEmail({
  userName,
  organizationName,
  betaUserNumber,
  dashboardUrl = `${emailBaseUrl}/dashboard`,
  feedbackUrl = `${emailBaseUrl}/dashboard/feedback`,
}: BetaWelcomeEmailProps): string {
  const content = `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        🎉 Connect 베타 테스터로 초대합니다!
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        안녕하세요 ${userName}님,<br/>
        <strong>${organizationName}</strong>을(를) Connect 베타 테스트 프로그램에 초대합니다.
      </p>
      <p style="font-size: 14px; color: #6b7280; margin: 12px 0 0;">
        베타 사용자 번호: <strong>#${betaUserNumber} / 50</strong>
      </p>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #1e40af; margin: 0; font-weight: 600;">
        💡 베타 특전
      </p>
      <ul style="font-size: 14px; color: #1e40af; margin: 8px 0 0; padding-left: 20px; line-height: 1.6;">
        <li><strong>₩4,900/월</strong> 베타 가격 (30일간, 정가 ₩49,000의 90% 할인)</li>
        <li>30일 이후 자동 업그레이드 시 <strong>첫 3개월 50% 할인</strong></li>
        <li>모든 Pro 기능 무제한 사용 (매칭, AI 설명, Q&A 챗봇)</li>
        <li>우선 고객지원 (24시간 이내 응답 보장)</li>
        <li>정식 출시 시 Early Adopter 배지 제공</li>
      </ul>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        🚀 Connect로 할 수 있는 것
      </h3>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          1️⃣ AI 기반 매칭 (하루 2회 업데이트)
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          귀사에 딱 맞는 정부 R&D 과제를 자동으로 찾아드립니다. IITP, KEIT, TIPA, KIMST 등 주요 4개 기관의 최신 공고 200~500건을 매일 스크래핑하여 실시간 매칭합니다.
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          2️⃣ AI 매칭 설명 (Claude Sonnet 4.5)
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          왜 이 과제가 귀사에 적합한지 AI가 <strong>한국어로 상세히 설명</strong>합니다. 산업 매칭도, TRL 호환성, 인증 요구사항, 예산 적합성 등을 쉽게 이해할 수 있습니다.
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          3️⃣ Q&A 챗봇 (24/7 즉시 답변)
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          과제 관련 질문을 AI 챗봇에게 물어보세요. 지원 자격, TRL 수준, 인증 요구사항, 신청 전략 등 궁금한 점을 즉시 해결할 수 있습니다.
        </p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          4️⃣ 폴백 시스템 (99.9% 가용성)
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          AI API 장애 시에도 서비스가 중단되지 않습니다. 캐시와 폴백 콘텐츠를 통해 <strong>항상 안정적인 서비스</strong>를 제공합니다.
        </p>
      </div>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${dashboardUrl}" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        대시보드로 이동하기
      </a>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        📖 빠른 시작 가이드 (3분)
      </h3>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          Step 1: 조직 프로필 설정 (1분)
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>대시보드 → 설정 → 조직 정보</li>
          <li>산업 분야, TRL 수준, 보유 인증 입력</li>
          <li>연간 매출, R&D 경험 입력 (선택)</li>
        </ul>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          Step 2: 첫 매칭 결과 확인 (1분)
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>대시보드 → 매칭 결과 (상위 10개 과제)</li>
          <li>매칭 점수 0-100점 (산업 30점, TRL 20점, 인증 20점 등)</li>
          <li>"AI 설명 보기" 클릭하여 상세 이유 확인</li>
        </ul>
      </div>

      <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
        <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 12px;">
          Step 3: AI 챗봇으로 질문하기 (1분)
        </p>
        <ul style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>매칭 카드 → "AI에게 질문하기" 버튼 클릭</li>
          <li>예시 질문: "우리 회사가 이 과제에 지원할 수 있나요?"</li>
          <li>AI가 지원 자격, TRL 요구사항, 추천 사항 등을 설명합니다</li>
        </ul>
      </div>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">
        💬 베타 피드백 요청
      </p>
      <p style="font-size: 14px; color: #92400e; line-height: 1.6; margin: 0;">
        베타 테스트 기간 동안 귀하의 솔직한 피드백이 매우 중요합니다. 불편한 점, 개선 제안, 버그 리포트 등 무엇이든 공유해 주세요.
      </p>
      <a href="${feedbackUrl}" style="display: inline-block; margin-top: 12px; padding: 8px 16px; background-color: #f59e0b; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
        피드백 제출하기
      </a>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        🔧 베타 테스트 시나리오
      </h3>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0 0 12px;">
        다음 기능들을 테스트해 주시면 감사하겠습니다:
      </p>
      <ol style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>매칭 생성</strong>: 조직 프로필 설정 후 매칭 결과 확인</li>
        <li><strong>AI 설명 생성</strong>: 3개 이상 과제에서 "AI 설명 보기" 클릭</li>
        <li><strong>Q&A 챗봇 대화</strong>: 5개 이상 질문-답변 테스트</li>
        <li><strong>성능 모니터링</strong>: 응답 속도, 캐시 적중률 체감</li>
        <li><strong>폴백 시스템</strong>: AI 서비스 일시 중단 시에도 사용 가능한지 확인</li>
      </ol>
    </div>

    <div style="margin: 32px 0; padding-top: 24px; border-top: 2px solid #e5e7eb;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        📞 지원 및 문의
      </h3>
      <div style="font-size: 14px; color: #4b5563; line-height: 1.8;">
        <p style="margin: 0 0 8px;">
          <strong>이메일</strong>: <a href="mailto:support@connect.kr" style="color: #2563eb; text-decoration: none;">support@connect.kr</a> (24시간 이내 응답)
        </p>
        <p style="margin: 0 0 8px;">
          <strong>대시보드</strong>: <a href="${dashboardUrl}" style="color: #2563eb; text-decoration: none;">connect.kr/dashboard</a>
        </p>
        <p style="margin: 0 0 8px;">
          <strong>피드백</strong>: <a href="${feedbackUrl}" style="color: #2563eb; text-decoration: none;">connect.kr/dashboard/feedback</a>
        </p>
      </div>
    </div>

    <div style="margin: 32px 0; text-align: center; padding: 20px; background-color: #f0fdf4; border-radius: 8px;">
      <p style="font-size: 16px; font-weight: 600; color: #166534; margin: 0 0 8px;">
        🎯 목표: 2026년 1월 1일 정식 출시
      </p>
      <p style="font-size: 14px; color: #15803d; margin: 0; line-height: 1.6;">
        ${userName}님의 피드백이 Connect를 더 나은 플랫폼으로 만듭니다.<br/>
        함께 한국 R&D 생태계를 혁신해 나갑시다! 🚀
      </p>
    </div>
  `;

  return baseEmailTemplate({
    title: 'Connect 베타 테스터 환영합니다',
    preheader: `${organizationName}을(를) Connect 베타 프로그램에 초대합니다. ₩4,900/월 특별 가격으로 시작하세요!`,
    content,
  });
}

/**
 * Example usage:
 *
 * ```typescript
 * import { generateBetaWelcomeEmail } from '@/lib/email/templates/beta-welcome';
 * import { sendEmail } from '@/lib/email/utils';
 *
 * const htmlContent = generateBetaWelcomeEmail({
 *   userName: '김철수',
 *   userEmail: 'kim@example.com',
 *   organizationName: 'ABC테크놀로지',
 *   betaUserNumber: 23,
 * });
 *
 * await sendEmail({
 *   to: 'kim@example.com',
 *   subject: 'Connect 베타 테스터로 초대합니다! 🎉',
 *   html: htmlContent,
 * });
 * ```
 */
