/**
 * Weekly Digest Email
 *
 * Sent every Sunday at 8 AM KST with a summary of new opportunities.
 */

import { baseEmailTemplate } from './base';
import { formatKoreanDate, formatBudgetKorean } from '../utils';
import { emailBaseUrl } from '../config';

export interface WeeklyDigestEmailData {
  userName: string;
  organizationName: string;
  weekStart: Date;
  weekEnd: Date;
  stats: {
    newPrograms: number;
    newMatches: number;
    upcomingDeadlines: number;
  };
  topMatches: Array<{
    id: string;
    title: string;
    agencyName: string;
    score: number;
    deadline: Date | null;
    budgetAmount: number | null;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    agencyName: string;
    deadline: Date;
    daysUntil: number;
  }>;
}

export function weeklyDigestEmailTemplate(data: WeeklyDigestEmailData): string {
  const { userName, organizationName, weekStart, weekEnd, stats, topMatches, upcomingDeadlines } =
    data;

  const content = `
    <h2 style="margin: 0 0 8px; font-size: 24px; font-weight: bold; color: #111827;">
      📊 주간 펀딩 리포트
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280;">
      ${formatKoreanDate(weekStart)} ~ ${formatKoreanDate(weekEnd)}
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; color: #6b7280;">
      안녕하세요 ${userName}님, 이번 주 <strong>${organizationName}</strong>의 R&D 기회를 요약해드립니다.
    </p>

    <!-- Statistics -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 32px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 20px; border-radius: 12px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #bfdbfe;">새 과제</p>
        <p style="margin: 8px 0 0; font-size: 32px; font-weight: bold; color: #ffffff;">${stats.newPrograms}</p>
      </div>
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 12px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #d1fae5;">새 매칭</p>
        <p style="margin: 8px 0 0; font-size: 32px; font-weight: bold; color: #ffffff;">${stats.newMatches}</p>
      </div>
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 12px; text-align: center;">
        <p style="margin: 0; font-size: 14px; color: #fef3c7;">다가오는 마감</p>
        <p style="margin: 8px 0 0; font-size: 32px; font-weight: bold; color: #ffffff;">${stats.upcomingDeadlines}</p>
      </div>
    </div>

    ${
      topMatches.length > 0
        ? `
    <!-- Top Matches -->
    <h3 style="margin: 32px 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
      ⭐ 이번 주 최고 매칭
    </h3>

    ${topMatches
      .slice(0, 3)
      .map(
        (match) => `
    <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; background-color: #ffffff;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #111827; flex: 1;">
          ${match.title}
        </h4>
        <div style="background-color: ${match.score >= 80 ? '#dcfce7' : '#dbeafe'};
                    color: ${match.score >= 80 ? '#166534' : '#1e40af'};
                    padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; white-space: nowrap; margin-left: 8px;">
          ${match.score}점
        </div>
      </div>
      <p style="margin: 8px 0; font-size: 13px; color: #6b7280;">
        ${match.agencyName}
        ${match.deadline ? ` · 📅 ${formatKoreanDate(match.deadline)}` : ''}
        ${match.budgetAmount ? ` · 💰 ${formatBudgetKorean(match.budgetAmount)}` : ''}
      </p>
      <a href="${emailBaseUrl}/dashboard/matches?highlight=${match.id}"
         style="display: inline-block; margin-top: 8px; padding: 8px 16px; background-color: #eff6ff; color: #2563eb; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
        상세 보기 →
      </a>
    </div>
    `
      )
      .join('')}
    `
        : ''
    }

    ${
      upcomingDeadlines.length > 0
        ? `
    <!-- Upcoming Deadlines -->
    <h3 style="margin: 32px 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
      ⏰ 다가오는 마감일
    </h3>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px;">
      ${upcomingDeadlines
        .slice(0, 5)
        .map(
          (program) => `
      <div style="padding: 12px 0; ${upcomingDeadlines.indexOf(program) < upcomingDeadlines.length - 1 ? 'border-bottom: 1px solid #fecaca;' : ''}">
        <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #111827;">
          ${program.title}
        </p>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          ${program.agencyName} ·
          <span style="color: #dc2626; font-weight: 600;">
            D-${program.daysUntil} (${formatKoreanDate(program.deadline)})
          </span>
        </p>
      </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    ${
      stats.newMatches === 0 && stats.upcomingDeadlines === 0
        ? `
    <div style="margin: 32px 0; padding: 24px; background-color: #f9fafb; border-radius: 12px; text-align: center;">
      <p style="margin: 0; font-size: 16px; color: #6b7280;">
        이번 주에는 새로운 매칭이나 마감일이 없습니다.<br />
        프로필을 업데이트하면 더 많은 기회를 찾을 수 있어요!
      </p>
      <a href="${emailBaseUrl}/dashboard/profile/edit"
         class="btn"
         style="display: inline-block; margin-top: 16px; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
        프로필 업데이트
      </a>
    </div>
    `
        : `
    <div style="text-align: center; margin-top: 32px;">
      <a href="${emailBaseUrl}/dashboard/matches"
         class="btn"
         style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        전체 매칭 보기
      </a>
    </div>
    `
    }

    <div style="margin-top: 24px; padding: 16px; background-color: #eff6ff; border-radius: 8px;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>💡 이번 주 Tip:</strong> 마감일 7일 전부터 지원 준비를 시작하세요. 서류 준비에 평균 3-5일이 소요됩니다.
      </p>
    </div>
  `;

  return baseEmailTemplate({
    title: '주간 펀딩 리포트',
    preheader: `새 과제 ${stats.newPrograms}개, 새 매칭 ${stats.newMatches}개`,
    content,
  });
}
