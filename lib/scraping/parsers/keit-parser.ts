/**
 * KEIT (한국산업기술평가관리원) Detail Parser
 *
 * Extracts detailed information from KEIT funding program pages:
 * - Deadline (multiple Korean date formats)
 * - Budget amount (억원, 백만원 formats)
 * - Target type (기업, 연구소, 공동)
 * - Full description and eligibility criteria
 */

import { Page } from 'playwright';
import {
  parseKoreanDate,
  parseBudgetAmount,
  determineTargetType,
  cleanHtmlText,
  extractTRLRange,
} from '../utils';

export interface KEITProgramDetails {
  description: string | null;
  deadline: Date | null;
  budgetAmount: number | null;
  targetType: 'COMPANY' | 'RESEARCH_INSTITUTE' | 'BOTH';
  minTRL: number | null;
  maxTRL: number | null;
  eligibilityCriteria: Record<string, any> | null;
}

/**
 * Parse KEIT program detail page
 */
export async function parseKEITDetails(
  page: Page,
  url: string
): Promise<KEITProgramDetails> {
  try {
    // Navigate to detail page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // KEIT uses different selectors
    const contentArea = await page.$('.board_view, .view-area, .notice-view, .content-wrap');

    if (!contentArea) {
      console.warn(`[KEIT] Content area not found for ${url}`);
      return getDefaultDetails();
    }

    // Extract full text content
    const fullText = await contentArea.textContent() || '';
    const cleanText = cleanHtmlText(fullText);

    // 1. Extract deadline
    const deadline = extractDeadline(cleanText);

    // 2. Extract budget amount
    const budgetAmount = extractBudget(cleanText);

    // 3. Determine target type
    const targetType = determineTargetType(cleanText);

    // 4. Extract TRL range
    const trlRange = extractTRLRange(cleanText);

    // 5. Extract description (first 2000 chars)
    const description = cleanText.substring(0, 2000).trim() || null;

    // 6. Extract eligibility criteria
    const eligibilityCriteria = extractEligibilityCriteria(cleanText);

    return {
      description,
      deadline,
      budgetAmount,
      targetType,
      minTRL: trlRange?.minTRL || null,
      maxTRL: trlRange?.maxTRL || null,
      eligibilityCriteria,
    };
  } catch (error: any) {
    console.error(`[KEIT] Failed to parse details for ${url}:`, error.message);
    return getDefaultDetails();
  }
}

/**
 * Extract deadline from text
 * KEIT-specific patterns:
 * - "공고기간: 2024.03.15 ~ 2024.04.15"
 * - "접수마감: 2024년 4월 15일 18시"
 * - "신청기한: 2024-04-15"
 */
function extractDeadline(text: string): Date | null {
  const deadlinePatterns = [
    /마감[일시]*\s*[:\-]?\s*([\d년월일.\-\/\s]+)/i,
    /공고기간\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s]+)/i,
    /접수[기간마감]*\s*[:\-]?\s*.*?~?\s*([\d년월일.\-\/\s]+)/i,
    /신청기한\s*[:\-]?\s*([\d년월일.\-\/\s]+)/i,
    /제출마감\s*[:\-]?\s*([\d년월일.\-\/\s]+)/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsedDate = parseKoreanDate(match[1].trim());
      if (parsedDate && parsedDate > new Date()) {
        return parsedDate;
      }
    }
  }

  return null;
}

/**
 * Extract budget amount
 * KEIT-specific patterns:
 * - "지원한도: 과제당 10억원 이내"
 * - "정부출연금: 최대 5억원"
 * - "사업규모: 총 100억원"
 */
function extractBudget(text: string): number | null {
  const budgetPatterns = [
    /지원한도\s*[:\-]?\s*과제당\s*([^\n]+)/i,
    /정부출연금\s*[:\-]?\s*([^\n]+)/i,
    /지원금액\s*[:\-]?\s*([^\n]+)/i,
    /지원규모\s*[:\-]?\s*([^\n]+)/i,
    /사업비\s*[:\-]?\s*([^\n]+)/i,
    /과제당\s*최대\s*([^\n]+)/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const amount = parseBudgetAmount(match[1]);
      if (amount && amount > 0) {
        return amount;
      }
    }
  }

  return null;
}

/**
 * Extract eligibility criteria
 * KEIT focuses on industrial manufacturing and carbon neutrality
 */
function extractEligibilityCriteria(text: string): Record<string, any> | null {
  const criteria: Record<string, any> = {};

  // Check for 중소기업 (SME) requirement
  if (/중소기업/i.test(text)) {
    criteria.smeOnly = true;
  }

  // Check for manufacturing focus
  if (/제조업|생산기술/i.test(text)) {
    criteria.manufacturingFocus = true;
  }

  // Check for carbon neutrality
  if (/탄소중립|친환경|그린/i.test(text)) {
    criteria.carbonNeutral = true;
  }

  // Check for 컨소시엄 (consortium) requirement
  if (/컨소시엄|공동개발/i.test(text)) {
    criteria.consortiumRequired = true;
  }

  // Check for specific industries
  const industryKeywords = [
    '제조',
    '소재',
    '부품',
    '장비',
    '탄소중립',
    '에너지',
    '스마트공장',
    '디지털전환',
  ];
  const foundIndustries = industryKeywords.filter(keyword =>
    text.includes(keyword)
  );

  if (foundIndustries.length > 0) {
    criteria.industries = foundIndustries;
  }

  return Object.keys(criteria).length > 0 ? criteria : null;
}

/**
 * Return default details when parsing fails
 */
function getDefaultDetails(): KEITProgramDetails {
  return {
    description: null,
    deadline: null,
    budgetAmount: null,
    targetType: 'BOTH',
    minTRL: null,
    maxTRL: null,
    eligibilityCriteria: null,
  };
}
