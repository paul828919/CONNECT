/**
 * NTIS Announcement Page Detail Parser
 *
 * Extracts detailed information from NTIS National R&D Integrated Announcement pages:
 * - Published date (공고일) - when announcement was published
 * - Deadline (마감일) - application deadline
 * - Budget amount (공고금액) - funding amount
 * - Target type (기업, 연구소, 공동)
 * - Full description and eligibility criteria
 *
 * Source: https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do
 * Primary data source for all Korean R&D funding announcements
 */

import { Page } from 'playwright';
import {
  parseKoreanDate,
  parseBudgetAmount,
  determineTargetType,
  cleanHtmlText,
  extractTRLRange,
} from '../utils';
import {
  extractCategoryFromMinistryAndAgency,
  getCombinedKeywords,
} from './agency-mapper';
import { logUnmappedAgency } from '../monitoring';
import { classifyTRL, type TRLClassification } from '@/lib/matching/trl-classifier';

export interface NTISAnnouncementDetails {
  description: string | null;
  deadline: Date | null;
  budgetAmount: number | null;
  targetType: 'COMPANY' | 'RESEARCH_INSTITUTE' | 'BOTH';
  minTRL: number | null;
  maxTRL: number | null;
  trlConfidence: 'explicit' | 'inferred' | 'missing'; // TRL detection confidence
  trlClassification: TRLClassification | null; // Full TRL classification with stage and keywords
  eligibilityCriteria: Record<string, any> | null;
  publishedAt: Date | null; // 공고일 - unique to NTIS announcements
  ministry: string | null; // 부처명
  announcingAgency: string | null; // 공고기관명
  category: string | null; // Industry sector (extracted from agency)
  keywords: string[]; // Technology keywords (agency defaults + extracted from title/description)
}

/**
 * Parse NTIS announcement detail page
 * NTIS uses plain text "Label : Value" format, NOT HTML tables
 */
export async function parseNTISAnnouncementDetails(
  page: Page,
  url: string
): Promise<NTISAnnouncementDetails> {
  try {
    // Navigate to detail page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for dynamic content

    // Extract full body text once (NTIS uses plain text, not HTML tables)
    const bodyText = await page.textContent('body') || '';
    const cleanText = cleanHtmlText(bodyText);

    // 1. Extract publishedAt (공고일)
    const publishedAt = extractPublishedDate(bodyText);

    // 2. Extract deadline (마감일)
    const deadline = extractDeadline(bodyText);

    // 3. Extract budget amount (공고금액)
    const budgetAmount = extractBudget(bodyText);

    // 4. Extract ministry and announcing agency
    const ministry = extractFieldValue(bodyText, '부처명');
    const announcingAgency = extractFieldValue(bodyText, '공고기관명');

    // 5. Extract description (공고내용)
    const description = await extractDescription(page);

    // 6. Determine target type from description
    const targetType = determineTargetType(cleanText);

    // 7. Extract TRL range with confidence tracking
    const trlRange = extractTRLRange(cleanText);

    // Generate TRL classification if TRL detected
    let trlClassification: TRLClassification | null = null;
    let trlConfidence: 'explicit' | 'inferred' | 'missing' = 'missing';

    if (trlRange) {
      trlConfidence = trlRange.confidence;
      try {
        trlClassification = classifyTRL(trlRange.minTRL, trlRange.maxTRL);
      } catch (error) {
        console.warn(`[NTIS-ANNOUNCEMENT] Failed to classify TRL ${trlRange.minTRL}-${trlRange.maxTRL}:`, error);
      }
    }

    // 8. Extract eligibility criteria
    const eligibilityCriteria = extractEligibilityCriteria(cleanText);

    // 9. Extract category from ministry and announcing agency (hierarchical categorization)
    const categoryResult = extractCategoryFromMinistryAndAgency(ministry, announcingAgency);
    const category = categoryResult.category;

    // Log programs requiring manual review (Case 3: Ministry-only, Case 4: Both NULL)
    if (categoryResult.requiresManualReview) {
      const title = await page.title();
      console.log(`⚠️  [MANUAL REVIEW] ${title}`);
      console.log(`   Ministry: ${ministry || 'NULL'}`);
      console.log(`   Agency: ${announcingAgency || 'NULL'}`);
      console.log(`   Source: ${categoryResult.source}, Confidence: ${categoryResult.confidence}`);
      if (categoryResult.context) {
        console.log(`   Context: ${categoryResult.context}`);
      }
    }

    // Log unmapped agency detection (Enhancement 1: Monitoring)
    if (category === null) {
      const title = await page.title();
      await logUnmappedAgency({
        ministry,
        agency: announcingAgency,
        programId: url, // Use URL as temporary ID (will be updated by worker)
        programTitle: title,
      });
      console.log(`🔔 [MONITORING] Unmapped agency detected: ${ministry || 'NULL'} / ${announcingAgency || 'NULL'}`);
    }

    // 10. Extract keywords (ministry + agency defaults + title/description extraction)
    const keywords = await extractKeywords(page, ministry, announcingAgency, cleanText);

    return {
      description,
      deadline,
      budgetAmount,
      targetType,
      minTRL: trlRange?.minTRL || null,
      maxTRL: trlRange?.maxTRL || null,
      trlConfidence,
      trlClassification,
      eligibilityCriteria,
      publishedAt,
      ministry,
      announcingAgency,
      category,
      keywords,
    };
  } catch (error: any) {
    console.error(`[NTIS-ANNOUNCEMENT] Failed to parse details for ${url}:`, error.message);
    return getDefaultDetails();
  }
}

/**
 * Extract published date (공고일) from detail page
 * NTIS format: "공고일 : 2025.10.20" or "공고일 : 2025-10-20"
 */
function extractPublishedDate(bodyText: string): Date | null {
  try {
    // Pattern: "공고일 : 2025.10.20"
    const pattern = /공고일\s*:\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/;
    const match = bodyText.match(pattern);

    if (match && match[1]) {
      const parsed = parseKoreanDate(match[1]);

      // Only return if date is valid and not in the future (sanity check)
      if (parsed && parsed <= new Date()) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract publishedAt:', error);
  }

  return null;
}

/**
 * Extract deadline (마감일) from detail page
 * NTIS format: "마감일 : 2025.10.24" or "마감일 :" (empty = NULL)
 * Per user guidance: Allow NULL deadlines (many Jan-March announcements have TBD deadlines)
 */
function extractDeadline(bodyText: string): Date | null {
  try {
    // Pattern 1: "마감일 : 2025.10.24"
    let pattern = /마감일\s*:\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/;
    let match = bodyText.match(pattern);

    // Pattern 2: "접수마감 : 2025.10.24" (alternative label)
    if (!match) {
      pattern = /접수마감\s*:\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/;
      match = bodyText.match(pattern);
    }

    if (match && match[1]) {
      const parsed = parseKoreanDate(match[1]);

      // Return deadline even if in the past (user wants to see historical announcements)
      if (parsed) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract deadline:', error);
  }

  // Return NULL for missing deadlines (per user guidance: allow NULL deadlines)
  return null;
}

/**
 * Extract budget amount (공고금액)
 * NTIS format: "공고금액 : 10억원" or "공고금액 : 0억원" or "공고금액 : 미정"
 *
 * Per user guidance:
 * - "0억원" → NULL (budget TBD during Jan-March announcement season)
 * - "미정" → NULL (budget to be determined)
 * - Actual amounts like "10억원" → 1,000,000,000
 */
function extractBudget(bodyText: string): number | null {
  try {
    // Pattern 1: "공고금액 : 10억원" or "공고금액 : 0억원"
    let pattern = /공고금액\s*:\s*(\d+)억원/;
    let match = bodyText.match(pattern);

    // Pattern 2: "지원금액 : 10억원" (alternative label)
    if (!match) {
      pattern = /지원금액\s*:\s*(\d+)억원/;
      match = bodyText.match(pattern);
    }

    // Pattern 3: "총 지원 규모 : 10억원" (alternative label)
    if (!match) {
      pattern = /총\s*지원\s*규모\s*:\s*(\d+)억원/;
      match = bodyText.match(pattern);
    }

    if (match && match[1]) {
      const billionAmount = parseInt(match[1], 10);

      // Return NULL for "0억원" (per user guidance: treat as budget TBD)
      if (billionAmount === 0) {
        return null;
      }

      // Convert billion won to won: 10억원 → 1,000,000,000
      return billionAmount * 1000000000;
    }

    // Check for explicit "미정" (to be determined)
    if (/공고금액\s*:\s*(미정|추후|확정\s*전)/i.test(bodyText)) {
      return null;
    }
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract budget:', error);
  }

  // Return NULL for missing or TBD budgets (per user guidance)
  return null;
}

/**
 * Extract description (공고내용)
 * NTIS shows full announcement content in a content area
 */
async function extractDescription(page: Page): Promise<string | null> {
  try {
    // Try multiple selectors for content area
    const contentSelectors = [
      '.view-content',
      '.board-view-content',
      '#content',
      '.notice-content',
      'article',
      '.detail-content',
    ];

    for (const selector of contentSelectors) {
      const contentEl = await page.$(selector);
      if (contentEl) {
        const text = await contentEl.textContent() || '';
        const cleaned = cleanHtmlText(text);

        if (cleaned && cleaned.length > 100) {
          // Return first 2000 chars
          return cleaned.substring(0, 2000).trim();
        }
      }
    }

    // Fallback: Get all text from body (filtered for content keywords)
    const bodyText = await page.textContent('body') || '';
    const cleaned = cleanHtmlText(bodyText);

    if (cleaned && cleaned.length > 100) {
      return cleaned.substring(0, 2000).trim();
    }
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract description:', error);
  }

  return null;
}

/**
 * Helper: Extract field value from NTIS plain text layout
 * NTIS uses "Label : Value" format in plain text (NOT HTML tables)
 * Example: "부처명 : 산업통상자원부 공고기관명 : 한국산업기술기획평가원"
 */
function extractFieldValue(bodyText: string, fieldLabel: string): string | null {
  try {
    // Pattern: "Label : Value" where value continues until next field or newline
    // Use lookahead to stop at next Korean label followed by colon, or newline
    const pattern = new RegExp(
      `${fieldLabel}\\s*:\\s*([^\\n]+?)(?=\\s+[가-힣]+\\s*:|\\n|$)`,
      'i'
    );
    const match = bodyText.match(pattern);

    if (match && match[1]) {
      const value = match[1].trim();

      // Return null if value is empty or just whitespace
      if (value.length > 0 && value !== ':' && value !== '-') {
        return value;
      }
    }
  } catch (error) {
    console.warn(`[NTIS-ANNOUNCEMENT] Failed to extract field "${fieldLabel}":`, error);
  }

  return null;
}

/**
 * Extract eligibility criteria from announcement content
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

  return Object.keys(criteria).length > 0 ? criteria : null;
}

/**
 * Extract keywords from program title, description, ministry, and agency defaults
 *
 * Strategy:
 * 1. Get combined keywords from ministry + agency (e.g., MSIT + KHIDI → ['ICT', '과학기술', '의료', '바이오'])
 * 2. Extract technology terms from title (captured in page title element)
 * 3. Extract domain keywords from description (first 500 chars)
 * 4. Deduplicate and return top 15 keywords
 */
async function extractKeywords(
  page: Page,
  ministry: string | null,
  announcingAgency: string | null,
  descriptionText: string
): Promise<string[]> {
  const keywords = new Set<string>();

  // 1. Get combined keywords from ministry + agency (HIGH PRIORITY - always include)
  const defaultKeywords = getCombinedKeywords(ministry, announcingAgency);
  defaultKeywords.forEach(keyword => keywords.add(keyword));

  // 2. Extract from page title (program name often contains key technology terms)
  try {
    const title = await page.title();
    const titleKeywords = extractKeywordsFromText(title);
    titleKeywords.forEach(keyword => keywords.add(keyword));
  } catch (error) {
    // Silent fail - title extraction is optional
  }

  // 3. Extract from description (first 500 chars for performance)
  const descriptionSample = descriptionText.substring(0, 500);
  const descKeywords = extractKeywordsFromText(descriptionSample);
  descKeywords.forEach(keyword => keywords.add(keyword));

  // Convert Set to Array and return top 15 keywords
  return Array.from(keywords).slice(0, 15);
}

/**
 * Extract Korean technology keywords from text
 *
 * Uses pattern matching for common R&D terms:
 * - Technology domains (AI, 바이오, 환경, etc.)
 * - Project types (개발, 연구, 실증, etc.)
 * - Industry sectors (제조, 의료, 농업, etc.)
 */
function extractKeywordsFromText(text: string): string[] {
  const keywords: string[] = [];

  // Common technology domain keywords (Korean + English)
  const techPatterns = [
    // ICT & Digital
    /\b(AI|인공지능|머신러닝|딥러닝)\b/gi,
    /\b(IoT|사물인터넷|스마트|지능형)\b/gi,
    /\b(빅데이터|데이터분석|클라우드)\b/gi,
    /\b(소프트웨어|SW|앱|애플리케이션)\b/gi,
    /\b(5G|6G|통신|네트워크)\b/gi,

    // Bio & Healthcare
    /\b(바이오|생명공학|의료|헬스케어)\b/gi,
    /\b(제약|신약|치료제|백신)\b/gi,
    /\b(진단|검사|의료기기)\b/gi,

    // Environment & Energy
    /\b(환경|친환경|그린|탄소중립)\b/gi,
    /\b(에너지|신재생|태양광|풍력|수소)\b/gi,

    // Manufacturing & Materials
    /\b(제조|생산|공정|스마트공장)\b/gi,
    /\b(소재|부품|장비|반도체)\b/gi,

    // Agriculture & Food
    /\b(농업|스마트팜|작물|양식)\b/gi,
    /\b(식품|푸드테크|식품가공)\b/gi,

    // Infrastructure
    /\b(건설|교통|스마트시티|인프라)\b/gi,
    /\b(해양|수산|조선|해운)\b/gi,

    // Project types
    /\b(개발|연구|실증|사업화|상용화)\b/gi,
    /\b(플랫폼|시스템|솔루션)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 1) {
        keywords.push(match[1]);
      }
    }
  }

  // Deduplicate (case-insensitive for Korean)
  return Array.from(new Set(keywords.map(k => k.trim()))).filter(k => k.length > 0);
}

/**
 * Return default details when parsing fails
 */
function getDefaultDetails(): NTISAnnouncementDetails {
  return {
    description: null,
    deadline: null,
    budgetAmount: null,
    targetType: 'BOTH',
    minTRL: null,
    maxTRL: null,
    trlConfidence: 'missing',
    trlClassification: null,
    eligibilityCriteria: null,
    publishedAt: null,
    ministry: null,
    announcingAgency: null,
    category: null,
    keywords: [],
  };
}
