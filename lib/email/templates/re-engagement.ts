/**
 * Re-engagement Email Templates
 *
 * Email sequence for inactive users:
 * - Day 1: Soft reminder to complete profile
 * - Day 3: Value proposition - what they're missing
 * - Day 7: Final nudge with urgency
 */

import { baseEmailTemplate } from './base';
import { emailBaseUrl } from '../config';

export interface ReEngagementEmailData {
  userName: string;
  organizationName: string | null;
  daysSinceLastActivity: number;
  profileCompletion: number; // 0-100 percentage
  activePrograms: number; // Current open programs count
  hasMatches: boolean;
}

type ReEngagementDay = 1 | 3 | 7;

/**
 * Day 1: Gentle reminder - "We noticed you haven't been back"
 */
function day1Template(data: ReEngagementEmailData): string {
  const { userName, organizationName, profileCompletion } = data;
  const displayName = organizationName || userName;

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        ${displayName}님, 프로필 설정을 완료해주세요! 👋
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        Connect에 가입해 주셔서 감사합니다. 아직 프로필 설정이 완료되지 않아
        맞춤형 R&D 과제 매칭을 받지 못하고 계신 것 같습니다.
      </p>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #1e40af; margin: 0; font-weight: 600;">
        📊 현재 프로필 완성도: ${profileCompletion}%
      </p>
      ${profileCompletion < 100 ? `
      <p style="font-size: 14px; color: #1e40af; margin: 8px 0 0;">
        프로필을 100% 완성하면 더 정확한 매칭 결과를 받을 수 있습니다.
      </p>
      ` : ''}
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        ⏱️ 3분이면 충분합니다
      </h3>
      <ol style="font-size: 14px; color: #4b5563; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>산업 분야 및 주력 기술 선택</li>
        <li>회사 규모 및 R&D 역량 입력</li>
        <li>보유 인증 및 특허 정보 추가 (선택)</li>
      </ol>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${emailBaseUrl}/dashboard/profile/edit" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        프로필 완성하기
      </a>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        도움이 필요하시면 언제든지
        <a href="mailto:support@connectplt.kr" style="color: #2563eb; text-decoration: none;">support@connectplt.kr</a>로
        문의해 주세요.
      </p>
    </div>
  `;
}

/**
 * Day 3: Value proposition - "Look what you're missing"
 */
function day3Template(data: ReEngagementEmailData): string {
  const { userName, organizationName, activePrograms } = data;
  const displayName = organizationName || userName;

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        ${displayName}님, 현재 ${activePrograms}개의 R&D 과제가 접수 중입니다 🚀
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        지금 이 순간에도 귀사에 딱 맞는 정부 R&D 과제들이 접수 중일 수 있습니다.
        Connect가 귀사에 최적화된 과제를 찾아드릴 준비가 되어 있습니다.
      </p>
    </div>

    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #92400e; margin: 0; font-weight: 600;">
        ⚠️ 놓치고 계신 것들
      </p>
      <ul style="font-size: 14px; color: #92400e; margin: 8px 0 0; padding-left: 20px; line-height: 1.6;">
        <li>현재 <strong>${activePrograms}개</strong> 정부 R&D 과제 접수 중</li>
        <li>NTIS 기반 실시간 공고 업데이트</li>
        <li>AI 기반 정밀 매칭 (산업 + TRL + 예산 분석)</li>
      </ul>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        🎯 Connect가 제공하는 가치
      </h3>

      <div style="margin-bottom: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          ✅ 시간 절약
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          수백 개의 공고를 일일이 확인할 필요 없이, 귀사에 맞는 과제만 추천받으세요.
        </p>
      </div>

      <div style="margin-bottom: 16px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          ✅ 정확한 매칭
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          산업 적합도, TRL 수준, 예산 규모를 종합 분석하여 최적의 과제를 제안합니다.
        </p>
      </div>

      <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px;">
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px;">
          ✅ 마감 알림
        </p>
        <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin: 0;">
          중요한 마감일을 놓치지 않도록 D-7, D-3, D-1 알림을 보내드립니다.
        </p>
      </div>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${emailBaseUrl}/dashboard" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        지금 매칭 결과 확인하기
      </a>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        💡 <strong>Tip:</strong> 프로필 정보가 정확할수록 매칭 품질이 높아집니다.
      </p>
    </div>
  `;
}

/**
 * Day 7: Final nudge - "We miss you"
 */
function day7Template(data: ReEngagementEmailData): string {
  const { userName, organizationName, activePrograms, hasMatches } = data;
  const displayName = organizationName || userName;

  return `
    <div style="margin-bottom: 32px;">
      <h2 style="font-size: 24px; font-weight: bold; color: #111827; margin: 0 0 16px;">
        ${displayName}님, Connect가 기다리고 있습니다 💙
      </h2>
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0;">
        가입 후 일주일이 지났지만 아직 Connect를 제대로 사용해 보지 않으신 것 같습니다.
        ${hasMatches
          ? '이미 생성된 매칭 결과를 확인하고 관심 있는 과제를 저장해 보세요.'
          : '지금 바로 매칭을 생성하고 귀사에 맞는 R&D 과제를 찾아보세요.'}
      </p>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #991b1b; margin: 0; font-weight: 600;">
        🔥 이번 달 마감 과제를 놓치지 마세요!
      </p>
      <p style="font-size: 14px; color: #991b1b; margin: 8px 0 0;">
        현재 <strong>${activePrograms}개</strong>의 정부 R&D 과제가 접수 중이며,
        일부 과제는 곧 마감됩니다. 지금 확인하세요!
      </p>
    </div>

    <div style="margin: 32px 0;">
      <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px;">
        🎁 지금 시작하면 받는 혜택
      </h3>

      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
        <ul style="font-size: 14px; color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong>무료 플랜</strong>: 매월 2회 AI 매칭 생성</li>
          <li><strong>마감 알림</strong>: 관심 과제 D-7, D-3, D-1 자동 알림</li>
          <li><strong>주간 리포트</strong>: 새로운 R&D 공고 요약 메일</li>
          <li><strong>Pro 업그레이드</strong>: 무제한 매칭 + AI 상세 분석</li>
        </ul>
      </div>
    </div>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${emailBaseUrl}/dashboard" class="btn" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Connect 다시 시작하기
      </a>
      <p style="margin: 12px 0 0; font-size: 14px; color: #6b7280;">
        또는 <a href="${emailBaseUrl}/pricing" style="color: #2563eb; text-decoration: none;">Pro 플랜 알아보기</a>
      </p>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #374151;">
        <strong>더 이상 이메일을 받고 싶지 않으신가요?</strong>
      </p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        이 메일은 Connect 서비스 이용을 도와드리기 위해 발송되었습니다.
        <a href="${emailBaseUrl}/dashboard/settings" style="color: #2563eb; text-decoration: none;">알림 설정</a>에서
        수신 여부를 변경하실 수 있습니다.
      </p>
    </div>
  `;
}

/**
 * Generate re-engagement email based on day
 */
export function reEngagementEmailTemplate(
  data: ReEngagementEmailData,
  day: ReEngagementDay
): string {
  let content: string;
  let title: string;
  let preheader: string;

  switch (day) {
    case 1:
      content = day1Template(data);
      title = '프로필을 완성하고 매칭을 받아보세요';
      preheader = `${data.organizationName || data.userName}님, 프로필 설정을 완료하시면 맞춤형 R&D 과제 추천을 받을 수 있습니다.`;
      break;
    case 3:
      content = day3Template(data);
      title = `현재 ${data.activePrograms}개 R&D 과제 접수 중`;
      preheader = `${data.organizationName || data.userName}님에게 맞는 정부 R&D 과제를 찾아드릴 준비가 되었습니다.`;
      break;
    case 7:
      content = day7Template(data);
      title = 'Connect가 기다리고 있습니다';
      preheader = `${data.organizationName || data.userName}님, 지금 바로 맞춤형 R&D 과제 매칭을 시작하세요!`;
      break;
  }

  return baseEmailTemplate({
    title,
    preheader,
    content,
  });
}

/**
 * Get email subject based on day
 */
export function getReEngagementSubject(
  data: ReEngagementEmailData,
  day: ReEngagementDay
): string {
  const displayName = data.organizationName || data.userName;

  switch (day) {
    case 1:
      return `👋 ${displayName}님, 프로필 설정을 완료해주세요`;
    case 3:
      return `🚀 ${displayName}님, ${data.activePrograms}개 R&D 과제가 기다리고 있습니다`;
    case 7:
      return `💙 ${displayName}님, Connect가 기다리고 있습니다`;
  }
}
