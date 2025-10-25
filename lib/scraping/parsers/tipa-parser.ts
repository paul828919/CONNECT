/**
 * TIPA (중소기업기술정보진흥원) Detail Parser
 *
 * Extracts detailed information from TIPA funding program pages:
 * - Deadline (multiple Korean date formats)
 * - Budget amount (억원, 백만원 formats)
 * - Target type (기업, 연구소, 공동)
 * - Full description and eligibility criteria
 *
 * Note: TIPA focuses heavily on SME (중소기업) and startup support
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

export interface TIPAProgramDetails {
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
 * Parse TIPA program detail page
 */
export async function parseTIPADetails(
  page: Page,
  url: string
): Promise<TIPAProgramDetails> {
  try {
    // Navigate to detail page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // TIPA uses table-based layout
    const contentArea = await page.$('.board-view, .view-content, #contents, .notice-detail');

    if (!contentArea) {
      console.warn(`[TIPA] Content area not found for ${url}`);
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

    // 3. Determine target type (TIPA is almost always COMPANY)
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
      source: 'tipa',
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
    console.error(`[TIPA] Failed to parse details for ${url}:`, error.message);
    return getDefaultDetails();
  }
}

/**
 * Extract deadline from text
 * TIPA-specific patterns:
 * - "신청기간: 2024.03.15(금) ~ 04.15(월)"
 * - "접수마감: 2024년 4월 15일(월) 17시"
 * - "제출기한: 2024-04-15"
 */
function extractDeadline(text: string): Date | null {
  const deadlinePatterns = [
    /신청기간\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s()요금화수목토일]+)/i,
    /접수[기간마감]*\s*[:\-]?\s*.*?~?\s*([\d년월일.\-\/\s()요금화수목토일]+)/i,
    /제출기한\s*[:\-]?\s*([\d년월일.\-\/\s()요금화수목토일]+)/i,
    /마감[일시]*\s*[:\-]?\s*([\d년월일.\-\/\s()요금화수목토일]+)/i,
    /~\s*([\d년월일.\-\/\s()]+)\s*\d{1,2}[시:]?/i, // Capture time-stamped deadlines
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Remove day of week markers (월), (화), etc.
      const cleanedDate = match[1].replace(/\([일월화수목금토]\)/g, '').trim();
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
 * TIPA-specific patterns:
 * - "지원금액: 기업당 5천만원 이내"
 * - "지원한도: 최대 1억원"
 * - "정부지원금: 3천만원 ~ 5천만원"
 */
function extractBudget(text: string): number | null {
  const budgetPatterns = [
    /지원금액\s*[:\-]?\s*기업당\s*([^\n]+)/i,
    /지원한도\s*[:\-]?\s*([^\n]+)/i,
    /정부지원금\s*[:\-]?\s*([^\n]+)/i,
    /지원규모\s*[:\-]?\s*([^\n]+)/i,
    /최대\s*([^\n]+원)/i,
    /기업당\s*([^\n]+원)/i,
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
 * TIPA focuses on SMEs and startups
 */
function extractEligibilityCriteria(text: string): Record<string, any> | null {
  const criteria: Record<string, any> = {};

  // Check for 중소기업 (SME) requirement - almost always true for TIPA
  if (/중소기업/i.test(text)) {
    criteria.smeOnly = true;
  }

  // Check for 벤처기업 (venture company) requirement
  if (/벤처기업/i.test(text)) {
    criteria.ventureCompany = true;
  }

  // Check for startup focus
  if (/스타트업|창업|예비창업/i.test(text)) {
    criteria.startupFocus = true;
  }

  // Check for 소상공인 (small business owner)
  if (/소상공인/i.test(text)) {
    criteria.smallBusinessOwner = true;
  }

  // Check for regional requirements
  if (/지역특화|지역주도/i.test(text)) {
    criteria.regionalFocus = true;
  }

  // Check for specific industries
  const industryKeywords = [
    '기술혁신',
    '디지털전환',
    '스마트',
    '친환경',
    '탄소중립',
    '수출',
    '글로벌',
    '신시장',
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
function getDefaultDetails(): TIPAProgramDetails {
  return {
    description: null,
    deadline: null,
    budgetAmount: null,
    targetType: 'COMPANY', // TIPA almost always targets companies
    minTRL: null,
    maxTRL: null,
    eligibilityCriteria: null,
    announcementType: 'R_D_PROJECT', // Default to R&D project
  };
}
