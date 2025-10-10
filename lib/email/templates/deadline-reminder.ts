/**
 * Deadline Reminder Email
 *
 * Sent 7 days, 3 days, and 1 day before funding program deadline.
 */

import { baseEmailTemplate } from './base';
import { formatKoreanDate, getDaysUntilDeadline, formatBudgetKorean } from '../utils';
import { emailBaseUrl } from '../config';

export interface DeadlineReminderEmailData {
  userName: string;
  organizationName: string;
  program: {
    id: string;
    title: string;
    agencyName: string;
    deadline: Date;
    budgetAmount: number | null;
    announcementUrl: string;
    matchScore: number;
  };
  daysUntilDeadline: number;
}

export function deadlineReminderEmailTemplate(data: DeadlineReminderEmailData): string {
  const { userName, organizationName, program, daysUntilDeadline } = data;

  const urgencyLevel =
    daysUntilDeadline === 1 ? 'critical' : daysUntilDeadline <= 3 ? 'high' : 'medium';

  const urgencyColor = {
    critical: { bg: '#fef2f2', text: '#991b1b', border: '#dc2626' },
    high: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    medium: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  }[urgencyLevel];

  const content = `
    <div style="background-color: ${urgencyColor.bg}; border-left: 4px solid ${urgencyColor.border}; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: bold; color: ${urgencyColor.text};">
        ⏰ ${daysUntilDeadline === 1 ? '내일' : `D-${daysUntilDeadline}`} 마감 과제 알림
      </h2>
      <p style="margin: 0; font-size: 16px; color: ${urgencyColor.text};">
        ${daysUntilDeadline === 1 ? '⚠️ 마감이 내일입니다!' : `마감까지 ${daysUntilDeadline}일 남았습니다.`}
      </p>
    </div>

    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280;">
      안녕하세요 ${userName}님, <strong>${organizationName}</strong>이 관심 있는 R&D 과제의 마감일이 다가왔습니다.
    </p>

    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; background-color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">
          ${program.title}
        </h3>
        <div style="background-color: ${program.matchScore >= 80 ? '#dcfce7' : '#dbeafe'};
                    color: ${program.matchScore >= 80 ? '#166534' : '#1e40af'};
                    padding: 6px 14px; border-radius: 16px; font-size: 14px; font-weight: 600; white-space: nowrap; margin-left: 12px;">
          매칭 ${program.matchScore}점
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; background-color: #f3f4f6; padding: 6px 12px; border-radius: 6px; font-size: 14px; color: #4b5563; margin-right: 8px;">
          ${program.agencyName}
        </span>
      </div>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 32px;">📅</div>
          <div>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">마감일</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold; color: #dc2626;">
              ${formatKoreanDate(program.deadline)} (${daysUntilDeadline === 1 ? '내일' : `D-${daysUntilDeadline}`})
            </p>
          </div>
        </div>
      </div>

      ${
        program.budgetAmount
          ? `<div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">💰 지원 규모</p>
        <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; color: #111827;">
          ${formatBudgetKorean(program.budgetAmount)}
        </p>
      </div>`
          : ''
      }

      <div style="display: flex; gap: 12px; margin-top: 20px;">
        <a href="${program.announcementUrl}"
           target="_blank"
           class="btn"
           style="flex: 1; display: inline-block; padding: 12px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center;">
          공고문 보기
        </a>
        <a href="${emailBaseUrl}/dashboard/matches?highlight=${program.id}"
           class="btn"
           style="flex: 1; display: inline-block; padding: 12px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center;">
          상세 정보
        </a>
      </div>
    </div>

    <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>💡 지원 전 체크리스트:</strong>
      </p>
      <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #1e40af;">
        <li style="margin: 4px 0;">지원 자격 요건 확인</li>
        <li style="margin: 4px 0;">필수 서류 준비 (사업자등록증, 재무제표 등)</li>
        <li style="margin: 4px 0;">연구개발계획서 작성</li>
        <li style="margin: 4px 0;">컨소시엄 구성 (필요시)</li>
      </ul>
    </div>

    ${
      daysUntilDeadline === 1
        ? `<div style="margin-top: 20px; padding: 16px; background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #dc2626;">
        ⚠️ 마감이 내일입니다! 지금 바로 지원하세요.
      </p>
    </div>`
        : ''
    }
  `;

  return baseEmailTemplate({
    title: `D-${daysUntilDeadline} 마감 알림`,
    preheader: `${program.title} - ${formatKoreanDate(program.deadline)} 마감`,
    content,
  });
}
