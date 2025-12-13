/**
 * New Match Notification Email
 *
 * Sent when a new high-score funding match is found for the user's organization.
 */

import { baseEmailTemplate } from './base';
import { formatKoreanDate, formatBudgetKorean, getDaysUntilDeadline } from '../utils';
import { emailBaseUrl } from '../config';

export interface NewMatchEmailData {
  userName: string;
  organizationName: string;
  matches: Array<{
    id: string;
    title: string;
    agencyName: string;
    score: number;
    deadline: Date | null;
    budgetAmount: number | null;
    explanation: string[];
  }>;
}

export function newMatchEmailTemplate(data: NewMatchEmailData): string {
  const { userName, organizationName, matches } = data;

  // Generate match cards HTML
  const matchCards = matches
    .slice(0, 3) // Top 3 matches
    .map(
      (match) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px; background-color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827; flex: 1;">
          ${match.title}
        </h3>
        <div style="background-color: ${match.score >= 80 ? '#dcfce7' : match.score >= 70 ? '#dbeafe' : '#fef3c7'};
                    color: ${match.score >= 80 ? '#166534' : match.score >= 70 ? '#1e40af' : '#92400e'};
                    padding: 4px 12px; border-radius: 16px; font-size: 14px; font-weight: 600; white-space: nowrap; margin-left: 12px;">
          ${match.score}점
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; background-color: #f3f4f6; padding: 4px 10px; border-radius: 6px; font-size: 13px; color: #4b5563; margin-right: 8px;">
          ${match.agencyName}
        </span>
        ${
          match.deadline
            ? `<span style="display: inline-block; background-color: #fef2f2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-size: 13px;">
          📅 D-${getDaysUntilDeadline(match.deadline)} (${formatKoreanDate(match.deadline)})
        </span>`
            : ''
        }
      </div>

      ${
        match.budgetAmount
          ? `<p style="margin: 8px 0; font-size: 14px; color: #6b7280;">
        💰 지원 규모: <strong style="color: #111827;">${formatBudgetKorean(match.budgetAmount)}</strong>
      </p>`
          : ''
      }

      <div style="margin: 12px 0; padding: 12px; background-color: #f9fafb; border-radius: 8px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #374151;">✨ 매칭 이유</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4b5563;">
          ${match.explanation.slice(0, 3).map((reason) => `<li style="margin: 4px 0;">${reason}</li>`).join('')}
        </ul>
      </div>

      <a href="${emailBaseUrl}/dashboard/matches?highlight=${match.id}"
         class="btn"
         style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        상세 보기 →
      </a>
    </div>
  `
    )
    .join('');

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: bold; color: #111827;">
      🎯 새로운 연구과제 매칭을 찾았어요!
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280;">
      안녕하세요 ${userName}님, <strong>${organizationName}</strong>에 적합한 ${matches.length}개의 새로운 연구과제가 발견되었습니다.
    </p>

    ${matchCards}

    <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>💡 Tip:</strong> 매칭 점수가 높을수록 지원 자격이 적합합니다. 마감일을 확인하고 빠르게 지원하세요!
      </p>
    </div>

    <div style="text-align: center; margin-top: 32px;">
      <a href="${emailBaseUrl}/dashboard/matches"
         class="btn"
         style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        전체 매칭 보기
      </a>
    </div>
  `;

  return baseEmailTemplate({
    title: `새로운 연구과제 매칭 ${matches.length}건`,
    preheader: `${organizationName}에 적합한 연구과제 ${matches.length}개 발견`,
    content,
  });
}
