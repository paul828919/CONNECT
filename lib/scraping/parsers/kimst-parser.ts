/**
 * KIMST (해양수산과학기술진흥원) Detail Parser
 *
 * Extracts detailed information from KIMST funding program pages:
 * - Deadline (multiple Korean date formats)
 * - Budget amount (억원, 백만원 formats)
 * - Target type (기업, 연구소, 공동)
 * - Full description and eligibility criteria
 *
 * Note: KIMST focuses on maritime and fisheries technology
 */

import { Page } from 'playwright';
import {
  parseKoreanDate,
  parseBudgetAmount,
  determineTargetType,
  cleanHtmlText,
  extractTRLRange,
} from '../utils';
import { classifyAnnouncement } from '../classification';

export interface KIMSTProgramDetails {
  description: string | null;
  deadline: Date | null;
  budgetAmount: number | null;
  targetType: 'COMPANY' | 'RESEARCH_INSTITUTE' | 'BOTH';
  minTRL: number | null;
  maxTRL: number | null;
  eligibilityCriteria: Record<string, any> | null;
  announcementType: 'R_D_PROJECT' | 'SURVEY' | 'EVENT' | 'NOTICE' | 'UNKNOWN';
}

/**
 * Parse KIMST program detail page
 */
export async function parseKIMSTDetails(
  page: Page,
  url: string
): Promise<KIMSTProgramDetails> {
  try {
    // Navigate to detail page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // KIMST uses standard board layout
    const contentArea = await page.$('.board-detail, .view-content, .notice-content, article');

    if (!contentArea) {
      console.warn(`[KIMST] Content area not found for ${url}`);
      return getDefaultDetails();
    }

    // Extract title (from h1, h2, or .title elements)
    const titleElement = await page.$('h1, h2, .title, .subject');
    const title = (await titleElement?.textContent()) || '';

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

    // 7. Classify announcement type using shared utility
    const announcementType = classifyAnnouncement({
      title,
      description: cleanText,
      url,
      source: 'kimst',
    });

    return {
      description,
      deadline,
      budgetAmount,
      targetType,
      minTRL: trlRange?.minTRL || null,
      maxTRL: trlRange?.maxTRL || null,
      eligibilityCriteria,
      announcementType,
    };
  } catch (error: any) {
    console.error(`[KIMST] Failed to parse details for ${url}:`, error.message);
    return getDefaultDetails();
  }
}

/**
 * Extract deadline from text
 * KIMST-specific patterns:
 * - "신청기간: 2024. 3. 15.(금) ~ 4. 15.(월)"
 * - "접수마감: 2024년 4월 15일 17:00"
 * - "제출기한: 2024-04-15까지"
 */
function extractDeadline(text: string): Date | null {
  const deadlinePatterns = [
    /신청기간\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s()요금화수목토일]+)/i,
    /접수[기간마감]*\s*[:\-]?\s*.*?~?\s*([\d년월일.\-\/\s()요금화수목토일:]+)/i,
    /제출기한\s*[:\-]?\s*([\d년월일.\-\/\s()]+)/i,
    /마감[일시]*\s*[:\-]?\s*([\d년월일.\-\/\s()]+)/i,
    /까지\s*$.*?([\d년월일.\-\/\s]+)/im, // "XX일까지" pattern
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Remove day of week markers and time
      const cleanedDate = match[1]
        .replace(/\([일월화수목금토]\)/g, '')
        .replace(/\d{1,2}:\d{2}/g, '')
        .trim();
      const parsedDate = parseKoreanDate(cleanedDate);
      if (parsedDate) {
        return parsedDate;
      }
    }
  }

  return null;
}

/**
 * Extract budget amount
 * KIMST-specific patterns:
 * - "연구비: 과제당 5억원 이내"
 * - "지원금액: 총 10억원 (기관당 최대 3억원)"
 * - "정부출연금: 2억원 ~ 5억원"
 */
function extractBudget(text: string): number | null {
  const budgetPatterns = [
    /연구비\s*[:\-]?\s*과제당\s*([^\n]+)/i,
    /지원금액\s*[:\-]?\s*([^\n]+)/i,
    /정부출연금\s*[:\-]?\s*([^\n]+)/i,
    /지원규모\s*[:\-]?\s*([^\n]+)/i,
    /과제당\s*([^\n]+원)/i,
    /기관당\s*최대\s*([^\n]+원)/i,
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
 * KIMST focuses on maritime, fisheries, and ocean science
 */
function extractEligibilityCriteria(text: string): Record<string, any> | null {
  const criteria: Record<string, any> = {};

  // Check for research institute focus
  if (/연구기관|출연연|대학/i.test(text)) {
    criteria.researchInstituteFocus = true;
  }

  // Check for 중소기업 (SME) requirement
  if (/중소기업/i.test(text)) {
    criteria.smeEligible = true;
  }

  // Check for consortium requirement
  if (/컨소시엄|공동연구|산학연/i.test(text)) {
    criteria.consortiumRequired = true;
  }

  // Check for commercialization focus
  if (/상용화|사업화|실증/i.test(text)) {
    criteria.commercializationFocus = true;
  }

  // Check for specific industries (maritime focus)
  const industryKeywords = [
    '해양',
    '수산',
    '어업',
    '양식',
    '바이오',
    '해양플랜트',
    '항만',
    '선박',
    '수중',
    '해저',
    '스마트양식',
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
function getDefaultDetails(): KIMSTProgramDetails {
  return {
    description: null,
    deadline: null,
    budgetAmount: null,
    targetType: 'BOTH',
    minTRL: null,
    maxTRL: null,
    eligibilityCriteria: null,
    announcementType: 'R_D_PROJECT', // Default to R&D project
  };
}
