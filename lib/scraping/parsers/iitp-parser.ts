/**
 * IITP (정보통신기획평가원) Detail Parser
 *
 * Extracts detailed information from IITP funding program pages:
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
import { classifyAnnouncement } from '../classification';

export interface IITPProgramDetails {
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
 * Parse IITP program detail page
 */
export async function parseIITPDetails(
  page: Page,
  url: string
): Promise<IITPProgramDetails> {
  try {
    // Navigate to detail page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // Extract main content area
    const contentArea = await page.$('.view-content, .board-view, .content-area, article');

    if (!contentArea) {
      console.warn(`[IITP] Content area not found for ${url}`);
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

    // 5. Extract description (first 2000 chars of cleaned text)
    const description = cleanText.substring(0, 2000).trim() || null;

    // 6. Extract eligibility criteria
    const eligibilityCriteria = extractEligibilityCriteria(cleanText);

    // 7. Classify announcement type using shared utility
    const announcementType = classifyAnnouncement({
      title,
      description: cleanText,
      url,
      source: 'iitp',
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
    console.error(`[IITP] Failed to parse details for ${url}:`, error.message);
    return getDefaultDetails();
  }
}

/**
 * Extract deadline from text
 * Searches for common patterns:
 * - "접수기간: 2024.03.15 ~ 2024.04.15"
 * - "마감일: 2024년 4월 15일"
 * - "신청마감: 2024-04-15"
 * - "접수기간 2025-09-08 01시 ~ 2025-09-23 15시" (with time)
 */
function extractDeadline(text: string): Date | null {
  // Updated patterns to capture dates with optional time components (시, 분)
  const deadlinePatterns = [
    /접수기간\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s]+\d+시?\s*\d*분?)/i, // Capture date with optional time
    /마감[일시]*\s*[:\-]?\s*([\d년월일.\-\/\s]+\d+시?\s*\d*분?)/i,
    /신청[기간마감]*\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s]+\d+시?\s*\d*분?)/i,
    /제출[기한마감]*\s*[:\-]?\s*([\d년월일.\-\/\s]+\d+시?\s*\d*분?)/i,
    // Fallback: simpler patterns without time
    /접수기간\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s]+)/i,
    /마감[일시]*\s*[:\-]?\s*([\d년월일.\-\/\s]+)/i,
    /신청[기간]*\s*[:\-]?\s*.*?~\s*([\d년월일.\-\/\s]+)/i,
    /제출[기한]*\s*[:\-]?\s*([\d년월일.\-\/\s]+)/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsedDate = parseKoreanDate(match[1].trim());
      if (parsedDate) {
        // Return ALL dates (both past and future) for proper status management
        // The match generation logic will filter expired programs
        return parsedDate;
      }
    }
  }

  return null;
}

/**
 * Extract budget amount
 * Searches for patterns like:
 * - "지원금액: 10억원"
 * - "총사업비: 5백만원 ~ 2억원"
 * - "지원규모: 과제당 최대 3억원"
 */
function extractBudget(text: string): number | null {
  const budgetPatterns = [
    /지원금액\s*[:\-]?\s*([^\n]+)/i,
    /지원규모\s*[:\-]?\s*([^\n]+)/i,
    /총사업비\s*[:\-]?\s*([^\n]+)/i,
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
 */
function extractEligibilityCriteria(text: string): Record<string, any> | null {
  const criteria: Record<string, any> = {};

  // Check for 중소기업 (SME) requirement
  if (/중소기업/i.test(text)) {
    criteria.smeOnly = true;
  }

  // Check for 벤처기업 (venture company) requirement
  if (/벤처기업/i.test(text)) {
    criteria.ventureCompany = true;
  }

  // Check for 컨소시엄 (consortium) requirement
  if (/컨소시엄|공동연구/i.test(text)) {
    criteria.consortiumRequired = true;
  }

  // Check for specific industries
  const industryKeywords = ['ICT', 'AI', '인공지능', '소프트웨어', '클라우드', '빅데이터', '5G', '6G'];
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
function getDefaultDetails(): IITPProgramDetails {
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
