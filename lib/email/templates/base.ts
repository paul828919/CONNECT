/**
 * Base Email Template
 *
 * Provides consistent Korean branding across all email notifications.
 */

import { emailBaseUrl } from '../config';

export interface BaseEmailProps {
  title: string;
  preheader?: string;
  content: string;
}

export function baseEmailTemplate({ title, preheader, content }: BaseEmailProps): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
      background-color: #f3f4f6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
    }
    .header p {
      margin: 8px 0 0;
      font-size: 14px;
      color: #e0e7ff;
    }
    .content {
      padding: 32px 24px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      background-color: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 4px 0;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 16px 0;
    }
    .btn:hover {
      background-color: #1d4ed8;
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <h1>Connect</h1>
            <p>국가 R&D 생태계 매칭 플랫폼</p>
          </div>

          <!-- Content -->
          <div class="content">
            ${content}
          </div>

          <!-- Footer -->
          <div class="footer">
            <p><strong>Connect Platform</strong></p>
            <p>Korea's Innovation Ecosystem Matching Platform</p>
            <p style="margin-top: 16px;">
              <a href="${emailBaseUrl}/dashboard/settings/notifications">알림 설정</a> ·
              <a href="${emailBaseUrl}/dashboard">대시보드</a> ·
              <a href="mailto:support@connectplt.kr">고객지원</a>
            </p>
            <p style="margin-top: 12px; color: #9ca3af;">
              이 이메일을 더 이상 받고 싶지 않으시면 <a href="${emailBaseUrl}/dashboard/settings/notifications">알림 설정</a>에서 변경하실 수 있습니다.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
