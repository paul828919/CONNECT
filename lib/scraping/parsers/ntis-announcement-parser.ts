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
import {
  extractTextFromAttachment,
  extractKeywordsFromAttachmentText,
} from '../utils/attachment-parser';

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
  allowedBusinessStructures: ('CORPORATION' | 'SOLE_PROPRIETOR')[] | null; // Business structure restrictions
  attachmentUrls: string[]; // PDF/HWP attachment URLs
  trlInferred: boolean; // Whether TRL was auto-classified
}

/**
 * Comprehensive synonym dictionaries for Korean R&D announcement fields
 * Reduces NULL rates from ~40-50% to ~15-20% by covering institutional terminology variance
 */
const FIELD_SYNONYMS = {
  budget: [
    '공고금액',
    '지원규모',
    '지원예산',
    '지원금액',
    '연구비',
    '총연구비',
    '총사업비',
    '사업비',
    '지원한도',
    '과제당 지원금',
    // Phase 6 additions based on manual NTIS attachment verification (Oct 2025)
    '한국측연구비',      // Korean side research funding (QuantERA, Korea-Germany)
    '예산',             // Budget (Quantum Computing Flagship)
    '정부출연금',        // Government funding (Quantum Computing)
    '사업기간',          // Project period (often appears with budget)
    '과제당',           // Per project (common in multi-project announcements)
    '과제당 연간',       // Per project annually (Korea-Germany)
    '연구개발비',        // R&D funding
    '지원금',           // Support funding
  ],
  deadline: [
    '마감일',
    '신청마감일',
    '지원마감일',
    '모집마감일',
    '접수마감일',
    '신청기한',
    '접수기한',
    '제출마감',
  ],
  applicationPeriod: [
    '신청기간',
    '지원기간',
    '모집기간',
    '접수기간',
    '신청일정',
    '모집일정',
  ],
  eligibility: [
    '신청자격',
    '지원대상',
    '신청요건',
    '지원요건',
    '참여자격',
    '응모자격',
  ],
  businessStructure: {
    corporationOnly: [
      '법인사업자',
      '법인만',
      '법인에 한함',
      '법인사업자만',
      '법인기업',
      '법인 한정',
      '주식회사',
      '유한회사',
    ],
    excludeSoleProprietor: [
      '개인사업자 제외',
      '개인사업자 불가',
      '법인만 가능',
      '개인 제외',
    ],
    soleProprietorAllowed: [
      '개인사업자',
      '개인 가능',
      '법인 및 개인',
      '개인/법인',
    ],
  },
} as const;

/**
 * Find field value using synonym matching
 * Tries all synonyms until a match is found
 *
 * @param bodyText - Full page text
 * @param synonyms - Array of field label synonyms
 * @returns Matched value or null
 */
function findFieldWithSynonyms(
  bodyText: string,
  synonyms: readonly string[]
): string | null {
  for (const synonym of synonyms) {
    const value = extractFieldValue(bodyText, synonym);
    if (value) {
      return value;
    }
  }
  return null;
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

    // 2. Extract deadline (마감일) - from body first
    const deadline = extractDeadline(bodyText);

    // 3. Extract ministry and announcing agency
    const ministry = extractFieldValue(bodyText, '부처명');
    const announcingAgency = extractFieldValue(bodyText, '공고기관명');

    // 4. Extract description (공고내용)
    const description = await extractDescription(page);

    // 5. Extract attachment URLs early (needed for budget/TRL extraction)
    const attachmentUrls = await extractAttachmentUrls(page);

    // 6. Download and extract text from announcement documents
    // This text contains critical details (budget, TRL, eligibility) often missing from HTML
    const attachmentText = await downloadAndExtractAttachmentText(page, attachmentUrls, url);

    // 7. Create combined text for enhanced field extraction
    const combinedText = cleanText + '\n\n' + attachmentText;

    // 8. Extract budget amount from combined text (body + attachments)
    const budgetAmount = extractBudget(combinedText);

    // 9. Determine target type from combined text
    const targetType = determineTargetType(combinedText);

    // 10. Extract TRL range from combined text with confidence tracking
    const trlRange = extractTRLRange(combinedText);

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

    // 11. Extract eligibility criteria from combined text
    const eligibilityCriteria = extractEligibilityCriteria(combinedText);

    // 12. Extract category from ministry and announcing agency (hierarchical categorization)
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

    // 13. Extract keywords (ministry + agency defaults + title/description + attachments)
    const keywords = await extractKeywords(
      page,
      ministry,
      announcingAgency,
      cleanText,
      attachmentText
    );

    // 14. Extract business structure requirements from combined text
    const allowedBusinessStructures = extractBusinessStructures(combinedText);

    // 15. Determine if TRL was inferred (vs explicitly stated)
    const trlInferred = trlRange ? trlRange.confidence === 'inferred' : false;

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
      allowedBusinessStructures,
      attachmentUrls,
      trlInferred,
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
 * Extract deadline (마감일) from detail page using comprehensive synonym matching
 * NTIS format: "마감일 : 2025.10.24" or "마감일 :" (empty = NULL)
 * Per user guidance: Allow NULL deadlines (many Jan-March announcements have TBD deadlines)
 */
function extractDeadline(bodyText: string): Date | null {
  try {
    // Try all deadline synonyms
    for (const synonym of FIELD_SYNONYMS.deadline) {
      const pattern = new RegExp(`${synonym}\\s*:\\s*(\\d{4}[.-]\\d{1,2}[.-]\\d{1,2})`);
      const match = bodyText.match(pattern);

      if (match && match[1]) {
        const parsed = parseKoreanDate(match[1]);

        // Return deadline even if in the past (user wants to see historical announcements)
        if (parsed) {
          return parsed;
        }
      }
    }
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract deadline:', error);
  }

  // Return NULL for missing deadlines (per user guidance: allow NULL deadlines)
  return null;
}

/**
 * Extract budget amount using comprehensive synonym matching
 * NTIS format: "공고금액 : 10억원" or "공고금액 : 0억원" or "공고금액 : 미정"
 *
 * Per user guidance:
 * - "0억원" → NULL (budget TBD during Jan-March announcement season)
 * - "미정" → NULL (budget to be determined)
 * - Actual amounts like "10억원" → 1,000,000,000
 */
/**
 * Extract budget amount with comprehensive pattern matching
 *
 * Phase 6 Enhancement: Based on manual NTIS attachment verification (Oct 2025)
 * Handles real-world patterns found in NTIS announcements:
 * - Decimal billions: "1,764.22억원" → 1,764,220,000,000 won
 * - Million won: "300백만원" → 300,000,000 won
 * - Thousands separator: "1,234억원" → 1,234,000,000,000 won
 * - Per-project: "과제당 연간 300백만원" → 300,000,000 won
 * - Combined: "총 1,764.22억원*('25년 93억원)" → 1,764,220,000,000 won (total)
 *
 * Test cases from Oct 2025 NTIS attachments:
 * 1. Quantum Computing: "총 1,764.22억원" ✓
 * 2. QuantERA: "과제당 연간 300백만원" ✓
 * 3. Korea-Germany: "과제당 연간 (한국측) 300백만원" ✓
 * 4. Nuclear MSR: "40백만원" ✓
 */
export function extractBudget(bodyText: string): number | null {
  try {
    // ========================================================================
    // HIGHEST PRIORITY: Direct amount format "금액 : 45,000,000원" or "금 액 : 45,000,000원"
    // November 5, 2025: Added for government tender announcements
    // Handles Korean spacing variations: "금액", "금 액"
    // ========================================================================
    const directAmountPattern = /금\s*액\s*[:：]\s*([\d,]+)원/i;
    const directAmountMatch = bodyText.match(directAmountPattern);

    if (directAmountMatch && directAmountMatch[1]) {
      const cleanedAmount = directAmountMatch[1].replace(/,/g, '');
      const amount = parseInt(cleanedAmount, 10);

      if (amount > 0 && amount < 1000000000000) { // Validate < 1 trillion won
        return amount;
      }
    }

    // ========================================================================
    // PRIORITY Pattern: Year-based budget ("2025년 256백만원")
    // November 5, 2025: Added to prioritize annual total budget over per-project amounts
    // CRITICAL FIX: Use \d not \\d in regex literals!
    // ========================================================================
    const yearBudgetBillionPattern = /['']?(\d{2}|20\d{2})년\s*([\d,\.]+)\s*억원/i;
    const yearBudgetBillionMatch = bodyText.match(yearBudgetBillionPattern);

    if (yearBudgetBillionMatch && yearBudgetBillionMatch[2]) {
      const cleanedAmount = yearBudgetBillionMatch[2].replace(/,/g, '');
      const billionAmount = parseFloat(cleanedAmount);

      if (billionAmount > 0 && billionAmount < 100000) {
        return Math.round(billionAmount * 100000000);
      }
    }

    const yearBudgetMillionPattern = /['']?(\d{2}|20\d{2})년\s*([\d,\.]+)\s*백만원/i;
    const yearBudgetMillionMatch = bodyText.match(yearBudgetMillionPattern);

    if (yearBudgetMillionMatch && yearBudgetMillionMatch[2]) {
      const cleanedAmount = yearBudgetMillionMatch[2].replace(/,/g, '');
      const millionAmount = parseFloat(cleanedAmount);

      if (millionAmount > 0 && millionAmount < 100000) {
        return Math.round(millionAmount * 1000000);
      }
    }

    // Try all budget synonyms
    for (const synonym of FIELD_SYNONYMS.budget) {
      // ========================================================================
      // Pattern 1: Billions with decimals/commas "1,764.22억원" or "1,234억원"
      // Enhanced Nov 5, 2025: Handle "총 215.6억원" format (total prefix)
      // ========================================================================
      const billionPattern = new RegExp(
        `${synonym}[^\\d]*(총\\s*)?([\\d,\\.]+)\\s*억원`,
        'i'
      );
      const billionMatch = bodyText.match(billionPattern);

      if (billionMatch && billionMatch[2]) {
        // Remove commas and parse: "1,764.22" → 1764.22 or "215.6" → 215.6
        const cleanedAmount = billionMatch[2].replace(/,/g, '');
        const billionAmount = parseFloat(cleanedAmount);

        // Validate reasonable range (0.01억 to 100,000억)
        if (billionAmount > 0 && billionAmount < 100000) {
          // Convert to won: 1,764.22억원 → 176,422,000,000
          // CRITICAL FIX: 억 = 10^8 (100 million), NOT 10^9 (1 billion)
          return Math.round(billionAmount * 100000000);
        }
      }

      // ========================================================================
      // Pattern 2: Millions "300백만원" or "40백만원"
      // Enhanced Nov 5, 2025: Handle "총 300백만원" format (total prefix)
      // ========================================================================
      const millionPattern = new RegExp(
        `${synonym}[^\\d]*(총\\s*)?([\\d,\\.]+)\\s*백만원`,
        'i'
      );
      const millionMatch = bodyText.match(millionPattern);

      if (millionMatch && millionMatch[2]) {
        // Remove commas and parse: "300" → 300
        const cleanedAmount = millionMatch[2].replace(/,/g, '');
        const millionAmount = parseFloat(cleanedAmount);

        // Validate reasonable range (1백만 to 100,000백만)
        if (millionAmount > 0 && millionAmount < 100000) {
          // Convert to won: 300백만원 → 300,000,000
          return Math.round(millionAmount * 1000000);
        }
      }

      // ========================================================================
      // Pattern 3: Check for explicit "미정" (to be determined)
      // ========================================================================
      const tbdPattern = new RegExp(`${synonym}\\s*:\\s*(미정|추후|확정\\s*전)`, 'i');
      if (tbdPattern.test(bodyText)) {
        return null;
      }
    }

    // ========================================================================
    // Fallback: Search for standalone budget amounts without synonym prefix
    // Useful for table formats or unusual layouts
    // ========================================================================

    // Try "총 [amount]억원" pattern (total budget)
    const totalBillionPattern = /총\s*([\\d,\\.]+)\s*억원/i;
    const totalBillionMatch = bodyText.match(totalBillionPattern);

    if (totalBillionMatch && totalBillionMatch[1]) {
      const cleanedAmount = totalBillionMatch[1].replace(/,/g, '');
      const billionAmount = parseFloat(cleanedAmount);

      if (billionAmount > 0 && billionAmount < 100000) {
        // CRITICAL FIX: 억 = 10^8 (100 million), NOT 10^9 (1 billion)
        return Math.round(billionAmount * 100000000);
      }
    }

    // ========================================================================
    // TABLE-AWARE PATTERNS (November 5, 2025)
    // Handles table formats where unit is in header, value is in cell
    // Example: "총연구비(억원) ... 48.75" → 4,875,000,000
    // ========================================================================

    // Try all budget synonyms with table header format
    for (const synonym of FIELD_SYNONYMS.budget) {
      // Pattern: "총연구비(억원)" header followed by number within 100 chars
      const tableHeaderBillionPattern = new RegExp(
        `${synonym}\\s*\\(\\s*억\\s*원\\s*\\)[^\\d]{0,100}([\\d,\\.]+)`,
        'i'
      );
      const tableHeaderBillionMatch = bodyText.match(tableHeaderBillionPattern);

      if (tableHeaderBillionMatch && tableHeaderBillionMatch[1]) {
        const cleanedAmount = tableHeaderBillionMatch[1].replace(/,/g, '');
        const billionAmount = parseFloat(cleanedAmount);

        if (billionAmount > 0 && billionAmount < 100000) {
          return Math.round(billionAmount * 100000000);
        }
      }

      // Pattern: "총연구비(백만원)" header followed by number within 100 chars
      const tableHeaderMillionPattern = new RegExp(
        `${synonym}\\s*\\(\\s*백\\s*만\\s*원\\s*\\)[^\\d]{0,100}([\\d,\\.]+)`,
        'i'
      );
      const tableHeaderMillionMatch = bodyText.match(tableHeaderMillionPattern);

      if (tableHeaderMillionMatch && tableHeaderMillionMatch[1]) {
        const cleanedAmount = tableHeaderMillionMatch[1].replace(/,/g, '');
        const millionAmount = parseFloat(cleanedAmount);

        if (millionAmount > 0 && millionAmount < 100000) {
          return Math.round(millionAmount * 1000000);
        }
      }
    }

    // ========================================================================
    // STANDALONE PATTERNS (for tables without prefix)
    // Example: Column shows just "48.75억원" or "875백만원"
    // ========================================================================

    // Standalone billion pattern (more permissive)
    const standaloneBillionPattern = /([\d,\.]+)\s*억원/;
    const standaloneBillionMatch = bodyText.match(standaloneBillionPattern);

    if (standaloneBillionMatch && standaloneBillionMatch[1]) {
      const cleanedAmount = standaloneBillionMatch[1].replace(/,/g, '');
      const billionAmount = parseFloat(cleanedAmount);

      if (billionAmount > 0 && billionAmount < 100000) {
        return Math.round(billionAmount * 100000000);
      }
    }

    // Standalone million pattern (more permissive)
    const standaloneMillionPattern = /([\d,\.]+)\s*백만원/;
    const standaloneMillionMatch = bodyText.match(standaloneMillionPattern);

    if (standaloneMillionMatch && standaloneMillionMatch[1]) {
      const cleanedAmount = standaloneMillionMatch[1].replace(/,/g, '');
      const millionAmount = parseFloat(cleanedAmount);

      if (millionAmount > 0 && millionAmount < 100000) {
        return Math.round(millionAmount * 1000000);
      }
    }

  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract budget:', error);
  }

  // Return NULL for missing or TBD budgets (per user guidance)
  return null;
}

/**
 * Enhanced budget extraction with track awareness (P2 Enhancement)
 *
 * Prevents extraction errors when announcements contain multiple track budgets
 * by filtering based on track name in title.
 *
 * Example: "2025 K-Hero General Track" announcement contains:
 *   - General Track: 5억원
 *   - Deep Tech Track: 50억원
 * → Returns 5억원 (not 50억원) because title specifies "General Track"
 *
 * @param bodyText - Full page text
 * @param announcementTitle - Page title (contains track name)
 * @returns Budget object with amount and detected track
 */
export function extractBudgetWithContext(
  bodyText: string,
  announcementTitle: string
): { amount: number | null; track: string | null } {
  // Define track-specific patterns with Korean terminology
  const trackMatches: Record<string, RegExp> = {
    '일반트랙': /일반\s*트랙[^0-9]*([0-9,\.]+\s*억원)/i,
    '딥테크': /딥테크[^0-9]*([0-9,\.]+\s*억원)/i,
    '글로벌': /글로벌[^0-9]*([0-9,\.]+\s*억원)/i,
  };

  // If title contains specific track name, filter budget extraction
  for (const [trackName, pattern] of Object.entries(trackMatches)) {
    if (announcementTitle.includes(trackName)) {
      const match = bodyText.match(pattern);
      if (match && match[1]) {
        // Use parseBudgetAmount utility to parse "5억원" format
        const amount = parseBudgetAmount(match[1]);
        if (amount !== null) {
          console.log(`[BUDGET-CONTEXT] Extracted ${amount} won for track: ${trackName}`);
          return { amount, track: trackName };
        }
      }
    }
  }

  // Fallback to existing logic (no track detected)
  return { amount: extractBudget(bodyText), track: null };
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

// ═══════════════════════════════════════════════════════════════════════════
// Enhanced Eligibility Criteria Extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enhanced eligibility criteria structure
 * Captures comprehensive requirements from Korean R&D announcements
 */
interface EligibilityCriteria {
  // A. Organization Requirements
  organizationRequirements?: {
    operatingYears?: {
      minimum?: number;
      maximum?: number;
      description?: string;
    };
    organizationType?: string[];
    employeeCount?: {
      minimum?: number;
      maximum?: number;
    };
  };

  // B. Financial Requirements
  financialRequirements?: {
    rdInvestmentRatio?: {
      minimum?: number;
      period?: string;
      calculationMethod?: string;
    };
    revenue?: {
      minimum?: number;
      maximum?: number;
    };
    investmentThreshold?: {
      minimumAmount: number; // KRW amount (e.g., 200000000 for 2억원)
      description?: string; // Original matched text for debugging
    };
  };

  // C. Certification Requirements
  certificationRequirements?: {
    required?: string[];
    documents?: string[];
  };

  // D. Geographic/Industry Requirements
  geographicRequirements?: {
    regions?: string[];
    restrictions?: string;
  };
  industryRequirements?: {
    sectors?: string[];
  };

  // E. Consortium Requirements (enhanced)
  consortiumRequirements?: {
    required?: boolean;
    composition?: {
      leadOrganization?: string[];
      participants?: string[];
    };
    type?: string[];
  };

  // F. Government Relationship
  governmentRelationship?: {
    requiredAgreements?: string[];
    preferredStatus?: string[];
    targetCountry?: string;
  };

  // G. Legacy fields (backward compatibility)
  researchInstituteFocus?: boolean;
  smeEligible?: boolean;
  consortiumRequired?: boolean;
  commercializationFocus?: boolean;

  // H. Raw text for debugging
  rawText?: string;
}

/**
 * Korean keyword patterns for eligibility extraction
 */
const ELIGIBILITY_PATTERNS = {
  operatingYears: {
    keywords: [/창업\s*(\d+)\s*년/i, /사업자\s*등록\s*(\d+)\s*년/i, /업력\s*(\d+)\s*년/i],
    qualifiers: {
      minimum: [/(\d+)\s*년\s*이상/i, /(\d+)\s*년\s*초과/i],
      maximum: [/(\d+)\s*년\s*이하/i, /(\d+)\s*년\s*이내/i, /(\d+)\s*년\s*미만/i],
    },
  },
  rdInvestmentRatio: [
    /R&D\s*투자비율\s*(\d+(?:\.\d+)?)\s*%\s*이상/i,
    /매출액\s*대비\s*R&D\s*투자비율\s*(\d+(?:\.\d+)?)\s*%/i,
    /연구개발비\s*(\d+(?:\.\d+)?)\s*%\s*이상/i,
  ],
  investmentThreshold: [
    // Phase 3: Investment threshold patterns (NO AI - pure regex)
    // Captures requirements like "투자 유치 2억원 이상", "200만원 이상 투자"

    // Pattern 1: "투자 유치 [amount] 이상" (investment raised X or more)
    /투자\s*유치\s*([\d,\.]+)\s*(억|백만|만)원\s*이상/i,
    /투자\s*유치\s*금액\s*([\d,\.]+)\s*(억|백만|만)원\s*이상/i,

    // Pattern 2: "벤처투자 [amount] 이상" (venture investment X or more)
    /벤처\s*투자\s*([\d,\.]+)\s*(억|백만|만)원\s*이상/i,

    // Pattern 3: "[amount] 이상 투자" (X or more investment - reverse order)
    /([\d,\.]+)\s*(억|백만|만)원\s*이상\s*투자/i,

    // Pattern 4: "투자 실적 [amount]" (investment track record)
    /투자\s*실적\s*([\d,\.]+)\s*(억|백만|만)원/i,

    // Pattern 5: "투자금 [amount] 이상" (investment amount X or more)
    /투자금\s*([\d,\.]+)\s*(억|백만|만)원\s*이상/i,

    // Pattern 6: "투자받은 금액 [amount] 이상" (received investment of X or more)
    /투자받은\s*금액\s*([\d,\.]+)\s*(억|백만|만)원\s*이상/i,

    // Pattern 7: "투자 유치 실적 [amount]" (investment raising track record)
    /투자\s*유치\s*실적\s*([\d,\.]+)\s*(억|백만|만)원/i,
  ],
  certifications: {
    required: [
      'INNO-BIZ',
      '이노비즈',
      '벤처기업',
      '경영혁신형기업',
      'Main-Biz',
      '메인비즈',
      '국가종합전자조달시스템',
      '학술·연구용역',
      '학술연구용역',
    ],
    documents: [
      '법인등기부등본',
      '사업자등록증',
      '창업기업 확인서',
      '재무제표',
      '중소기업 확인서',
      '중소기업확인서',
      '입찰참가자격등록',
    ],
  },
  government: {
    agreements: ['MOU', 'NDA', '양해각서', '비밀유지협약'],
    preferredStatus: ['우선협상대상자', '우선 선정'],
    targetEntity: ['상대국 정부 기관', '방산업체'],
    exclusions: [
      '금품·향응 등',
      '금품향응',
      '부정한 청탁',
      '사전 협의 또는 특정인의 낙찰',
      '공정한 경쟁',
    ],
  },
  organizationType: {
    sme: ['중소기업', '중기'],
    venture: ['벤처기업', '스타트업'],
    corporation: ['법인사업자', '법인', '주식회사'],
    soleProprietor: ['개인사업자'],
    startup: ['창업기업'],
  },
  industry: {
    defense: ['방산분야', '방위산업', '국방'],
    bio: ['바이오', '생명공학'],
    it: ['정보통신', 'ICT', 'IT'],
  },
} as const;

/**
 * Extract numeric value from Korean text pattern
 * Handles patterns like "7년", "2.5%", "10억원"
 */
function extractNumericValue(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match || !match[1]) return null;

  const value = parseFloat(match[1]);
  return isNaN(value) ? null : value;
}

/**
 * Extract organization requirements
 * Captures: operating years, org type, employee count
 */
function extractOrganizationRequirements(text: string): EligibilityCriteria['organizationRequirements'] {
  const requirements: NonNullable<EligibilityCriteria['organizationRequirements']> = {};

  // Operating years
  const operatingYears: NonNullable<EligibilityCriteria['organizationRequirements']>['operatingYears'] = {};

  // Check maximum years (e.g., "창업 7년 이내")
  for (const pattern of ELIGIBILITY_PATTERNS.operatingYears.qualifiers.maximum) {
    const years = extractNumericValue(text, pattern);
    if (years !== null) {
      operatingYears.maximum = years;
      break;
    }
  }

  // Check minimum years (e.g., "3년 이상")
  for (const pattern of ELIGIBILITY_PATTERNS.operatingYears.qualifiers.minimum) {
    const years = extractNumericValue(text, pattern);
    if (years !== null) {
      operatingYears.minimum = years;
      break;
    }
  }

  // Extract description if found
  if (/중소기업창업\s*지원법|중소기업기본법/i.test(text)) {
    const match = text.match(/(중소기업창업\s*지원법\s*제\s*\d+조|중소기업기본법\s*제\s*\d+조)/i);
    if (match) {
      operatingYears.description = match[1];
    }
  }

  if (Object.keys(operatingYears).length > 0) {
    requirements.operatingYears = operatingYears;
  }

  // Organization type
  const organizationType: string[] = [];
  Object.entries(ELIGIBILITY_PATTERNS.organizationType).forEach(([type, keywords]) => {
    if (keywords.some(keyword => text.includes(keyword))) {
      organizationType.push(type);
    }
  });
  if (organizationType.length > 0) {
    requirements.organizationType = organizationType;
  }

  return Object.keys(requirements).length > 0 ? requirements : undefined;
}

/**
 * Extract financial requirements
 * Captures: R&D investment ratio, revenue ranges, investment thresholds
 * Phase 3 Enhancement: Added investment threshold extraction (NO AI)
 */
function extractFinancialRequirements(text: string): EligibilityCriteria['financialRequirements'] {
  const requirements: NonNullable<EligibilityCriteria['financialRequirements']> = {};

  // R&D investment ratio
  for (const pattern of ELIGIBILITY_PATTERNS.rdInvestmentRatio) {
    const ratio = extractNumericValue(text, pattern);
    if (ratio !== null) {
      requirements.rdInvestmentRatio = {
        minimum: ratio,
        period: text.includes('최근 3년') ? '최근 3년간' : undefined,
        calculationMethod: text.includes('매출액 대비') ? '매출액 대비 R&D 투자비율' : undefined,
      };
      break;
    }
  }

  // Phase 3: Investment threshold extraction (NO AI - pure regex)
  // Extracts requirements like "투자 유치 2억원 이상" → 200,000,000 won
  for (const pattern of ELIGIBILITY_PATTERNS.investmentThreshold) {
    const match = text.match(pattern);
    if (match && match[1] && match[2]) {
      // Extract numeric value (remove commas)
      const cleanedAmount = match[1].replace(/,/g, '');
      const numericValue = parseFloat(cleanedAmount);

      if (isNaN(numericValue) || numericValue <= 0) {
        continue; // Skip invalid amounts
      }

      // Extract unit (억, 백만, 만)
      const unit = match[2];

      // Convert to won (KRW)
      let amountInWon: number;
      if (unit === '억') {
        // 1억 = 100,000,000 won
        amountInWon = Math.round(numericValue * 100000000);
      } else if (unit === '백만') {
        // 1백만 = 1,000,000 won
        amountInWon = Math.round(numericValue * 1000000);
      } else if (unit === '만') {
        // 1만 = 10,000 won
        amountInWon = Math.round(numericValue * 10000);
      } else {
        continue; // Unknown unit
      }

      // Validate reasonable range (10만원 to 100억원)
      if (amountInWon >= 100000 && amountInWon <= 10000000000) {
        requirements.investmentThreshold = {
          minimumAmount: amountInWon,
          description: match[0], // Store original matched text for debugging
        };
        break; // Use first valid match
      }
    }
  }

  return Object.keys(requirements).length > 0 ? requirements : undefined;
}

/**
 * Extract certification requirements
 * Captures: required certifications and documents
 */
function extractCertificationRequirements(text: string): EligibilityCriteria['certificationRequirements'] {
  const requirements: NonNullable<EligibilityCriteria['certificationRequirements']> = {};

  // Required certifications
  const required: string[] = [];
  ELIGIBILITY_PATTERNS.certifications.required.forEach(cert => {
    if (text.includes(cert)) {
      required.push(cert);
    }
  });
  if (required.length > 0) {
    requirements.required = required;
  }

  // Required documents
  const documents: string[] = [];
  ELIGIBILITY_PATTERNS.certifications.documents.forEach(doc => {
    if (text.includes(doc)) {
      documents.push(doc);
    }
  });

  // Additional pattern-based document detection (November 5, 2025)
  // Catches phrases like "중소기업 법인 및 확인에 관한 규정" → "중소기업확인서"
  // Also matches "중소기업확인서" or "중소기업 확인서"
  if (/중소기업.{0,30}확인/i.test(text) && !documents.includes('중소기업확인서')) {
    documents.push('중소기업확인서');
  }

  if (documents.length > 0) {
    requirements.documents = documents;
  }

  return Object.keys(requirements).length > 0 ? requirements : undefined;
}

/**
 * Extract consortium requirements
 * Captures: lead organization, participants, consortium type
 */
function extractConsortiumRequirements(text: string): EligibilityCriteria['consortiumRequirements'] {
  const requirements: NonNullable<EligibilityCriteria['consortiumRequirements']> = {};

  // Check if consortium is required
  if (/컨소시엄|공동연구|산학연/i.test(text)) {
    requirements.required = true;

    // Extract composition
    const composition: NonNullable<NonNullable<EligibilityCriteria['consortiumRequirements']>['composition']> = {};

    if (/주관기관/i.test(text)) {
      composition.leadOrganization = [];
      // Bidirectional matching: "주관기관 중소기업" or "중소기업 주관기관"
      if (/주관기관.*중소기업/i.test(text) || /중소기업.*주관기관/i.test(text)) {
        composition.leadOrganization.push('중소기업');
      }
    }

    if (/참여기관/i.test(text)) {
      composition.participants = [];
      if (/참여기관.*중소기업/i.test(text)) {
        composition.participants.push('중소기업');
      }
    }

    if (Object.keys(composition).length > 0) {
      requirements.composition = composition;
    }

    // Extract type
    const type: string[] = [];
    if (text.includes('산학연')) type.push('산학연');
    if (text.includes('방산분야 컨소시엄')) type.push('방산분야 컨소시엄');
    if (type.length > 0) {
      requirements.type = type;
    }
  }

  return Object.keys(requirements).length > 0 ? requirements : undefined;
}

/**
 * Extract government relationship requirements
 * Captures: MOU/NDA, preferred status, target countries
 */
function extractGovernmentRelationship(text: string): EligibilityCriteria['governmentRelationship'] {
  const requirements: NonNullable<EligibilityCriteria['governmentRelationship']> = {};

  // Required agreements
  const agreements: string[] = [];
  ELIGIBILITY_PATTERNS.government.agreements.forEach(agreement => {
    if (text.includes(agreement)) {
      agreements.push(agreement);
    }
  });
  if (agreements.length > 0) {
    requirements.requiredAgreements = agreements;
  }

  // Preferred status
  const preferredStatus: string[] = [];
  ELIGIBILITY_PATTERNS.government.preferredStatus.forEach(status => {
    if (text.includes(status)) {
      preferredStatus.push(status);
    }
  });
  if (preferredStatus.length > 0) {
    requirements.preferredStatus = preferredStatus;
  }

  // Target entity/country (use first match to avoid overwriting with lower-priority items)
  for (const entity of ELIGIBILITY_PATTERNS.government.targetEntity) {
    if (text.includes(entity)) {
      requirements.targetCountry = entity;
      break; // Stop at first match
    }
  }

  // Exclusion criteria (November 5, 2025: Added for government tender announcements)
  const exclusions: string[] = [];
  ELIGIBILITY_PATTERNS.government.exclusions.forEach(exclusion => {
    if (text.includes(exclusion)) {
      exclusions.push(exclusion);
    }
  });
  if (exclusions.length > 0) {
    requirements.exclusions = exclusions;
  }

  return Object.keys(requirements).length > 0 ? requirements : undefined;
}

/**
 * Extract eligibility criteria from announcement content
 * Enhanced version with comprehensive requirement extraction
 */
export function extractEligibilityCriteria(text: string): Record<string, any> | null {
  const criteria: EligibilityCriteria = {};

  // ══════════════════════════════════════════════════════════════════
  // NEW: Enhanced extraction with 6 helper functions
  // ══════════════════════════════════════════════════════════════════

  // 1. Organization requirements (operating years, org type)
  const orgReqs = extractOrganizationRequirements(text);
  if (orgReqs) {
    criteria.organizationRequirements = orgReqs;
  }

  // 2. Financial requirements (R&D ratio)
  const financialReqs = extractFinancialRequirements(text);
  if (financialReqs) {
    criteria.financialRequirements = financialReqs;
  }

  // 3. Certification requirements (INNO-BIZ, documents)
  const certReqs = extractCertificationRequirements(text);
  if (certReqs) {
    criteria.certificationRequirements = certReqs;
  }

  // 4. Consortium requirements (lead/participating orgs)
  const consortiumReqs = extractConsortiumRequirements(text);
  if (consortiumReqs) {
    criteria.consortiumRequirements = consortiumReqs;
  }

  // 5. Government relationship (MOU/NDA, priority status)
  const govReqs = extractGovernmentRelationship(text);
  if (govReqs) {
    criteria.governmentRelationship = govReqs;
  }

  // 6. Industry requirements (defense, bio, IT)
  const industryReqs: string[] = [];
  Object.entries(ELIGIBILITY_PATTERNS.industry).forEach(([sector, keywords]) => {
    if (keywords.some(keyword => text.includes(keyword))) {
      industryReqs.push(sector);
    }
  });
  if (industryReqs.length > 0) {
    criteria.industryRequirements = { sectors: industryReqs };
  }

  // ══════════════════════════════════════════════════════════════════
  // LEGACY: Maintain backward compatibility with existing boolean flags
  // ══════════════════════════════════════════════════════════════════

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
 * Extract business structure requirements from announcement content
 * Returns array of allowed business structures based on Korean terminology patterns
 */
export function extractBusinessStructures(
  bodyText: string
): ('CORPORATION' | 'SOLE_PROPRIETOR')[] | null {
  try {
    // Check for corporation-only indicators
    const corporationOnlyPatterns = FIELD_SYNONYMS.businessStructure.corporationOnly;
    const excludeSoleProprietorPatterns = FIELD_SYNONYMS.businessStructure.excludeSoleProprietor;

    const isCorporationOnly = corporationOnlyPatterns.some(pattern =>
      bodyText.includes(pattern)
    );

    const excludesSoleProprietor = excludeSoleProprietorPatterns.some(pattern =>
      bodyText.includes(pattern)
    );

    // If corporation-only restrictions detected, return CORPORATION only
    if (isCorporationOnly || excludesSoleProprietor) {
      return ['CORPORATION'];
    }

    // Check for explicit sole proprietor allowance
    const soleProprietorAllowedPatterns = FIELD_SYNONYMS.businessStructure.soleProprietorAllowed;
    const allowsSoleProprietor = soleProprietorAllowedPatterns.some(pattern =>
      bodyText.includes(pattern)
    );

    // If sole proprietors explicitly mentioned, return both
    if (allowsSoleProprietor) {
      return ['CORPORATION', 'SOLE_PROPRIETOR'];
    }

    // No explicit restrictions found - return null (unknown/unspecified)
    return null;
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract business structures:', error);
    return null;
  }
}

/**
 * Extract attachment file names from NTIS announcement page
 *
 * NTIS uses download proxy pattern: all hrefs point to /rndgate/eg/cmm/file/download.do
 * File extensions are only in link text: "file_87908913400906893.pdf"
 *
 * Supported file types: PDF, HWP, HWPX, ZIP, DOC, DOCX
 *
 * Returns array of file names (not URLs, since NTIS URLs require authentication)
 */
async function extractAttachmentUrls(page: Page): Promise<string[]> {
  try {
    // Find the "첨부파일" (attachments) section and extract all links within it
    const attachments = await page.evaluate(() => {
      // Find the element containing "첨부파일" text
      const allElements = Array.from(document.querySelectorAll('*'));
      const attachmentHeader = allElements.find((el) => el.textContent?.trim() === '첨부파일');

      if (!attachmentHeader) {
        return [];
      }

      // Find the parent container and then the list of attachments
      const container = attachmentHeader.parentElement;
      if (!container) {
        return [];
      }

      // Find all links in the attachment section
      const links = container.querySelectorAll('a');
      const fileNames: string[] = [];

      links.forEach((link) => {
        const fileName = link.textContent?.trim() || '';

        // Only include files with recognized extensions
        if (fileName && /\.(pdf|hwp|hwpx|zip|doc|docx)$/i.test(fileName)) {
          fileNames.push(fileName);
        }
      });

      return fileNames;
    });

    return attachments;
  } catch (error) {
    console.warn('[NTIS-ANNOUNCEMENT] Failed to extract attachment URLs:', error);
    return [];
  }
}

/**
 * Download and extract text from attachments for enhanced keyword extraction
 *
 * Strategy (per user guidance):
 * 1. Prefer alternate formats on same page (PDF > HWPX > DOCX > HWP)
 * 2. Download files using Playwright's download interception
 * 3. Extract text from downloaded files
 * 4. Return combined text from all parsable attachments
 *
 * @param page - Playwright page (already authenticated to NTIS)
 * @param attachmentFileNames - Array of attachment file names from extractAttachmentUrls()
 * @returns Combined text from all attachments (up to 10,000 characters)
 */
async function downloadAndExtractAttachmentText(
  page: Page,
  attachmentFileNames: string[],
  detailPageUrl: string
): Promise<string> {
  if (attachmentFileNames.length === 0) {
    return '';
  }

  console.log(`[NTIS-ATTACHMENT] Processing ${attachmentFileNames.length} attachments...`);

  let combinedText = '';
  let processedCount = 0;

  try {
    // Filter to only process announcement documents (공고문, 신청안내, etc.)
    // These contain budget/TRL/eligibility details, unlike supplementary files
    const announcementPatterns = [
      '공고',        // Announcement
      '신청안내',     // Application guide
      '사업안내',     // Project guide
      '붙임',        // Attachment (usually main document)
      '안내문',      // Guide document
      '계획',        // Plan
      '요강',        // Guideline
    ];

    const announcementFiles = attachmentFileNames.filter((fileName) => {
      // Check if filename contains any announcement keywords
      return announcementPatterns.some((pattern) => fileName.includes(pattern));
    });

    console.log(
      `[NTIS-ATTACHMENT] Filtered ${announcementFiles.length}/${attachmentFileNames.length} announcement documents`
    );

    // CRITICAL FIX (Oct 30, 2025): Deduplicate filenames
    // NTIS lists same filename multiple times in HTML (e.g., "공고.hwp" appears twice)
    // Clicking duplicate triggers "File Not Found" dialog only ONCE - second click times out
    // Solution: Deduplicate before processing to prevent timeout crashes
    const deduplicatedFiles = [...new Set(announcementFiles)];

    if (deduplicatedFiles.length < announcementFiles.length) {
      console.log(
        `[NTIS-ATTACHMENT] Removed ${announcementFiles.length - deduplicatedFiles.length} duplicate filenames`
      );
    }

    // Sort filtered files by priority: PDF > HWPX > HWP > others
    const sortedFiles = [...deduplicatedFiles].sort((a, b) => {
      const getPriority = (fileName: string): number => {
        if (fileName.endsWith('.pdf')) return 1;
        if (fileName.endsWith('.hwpx')) return 2;
        if (fileName.endsWith('.hwp')) return 3;
        if (fileName.endsWith('.docx')) return 4;
        return 99;
      };
      return getPriority(a) - getPriority(b);
    });

    // Process up to 2 announcement documents (to avoid excessive processing time)
    const filesToProcess = sortedFiles.slice(0, 2);

    for (const fileName of filesToProcess) {
      try {
        // Skip non-parsable formats
        if (/\.(zip|doc)$/i.test(fileName)) {
          console.log(`[NTIS-ATTACHMENT] Skipping ${fileName} (format not supported)`);
          continue;
        }

        console.log(`[NTIS-ATTACHMENT] Downloading ${fileName}...`);

        // Race between download starting OR "File Not Found" dialog appearing
        // NTIS sometimes shows alert dialog for missing files instead of starting download
        let dialogHandler: ((dialog: any) => Promise<void>) | null = null;
        let result: { type: 'download'; download: any } | { type: 'dialog' } | null = null;

        try {
          const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

          // Set up dialog listener for "File Not Found" alerts
          // Note: NTIS may trigger multiple dialogs in rapid succession for same file
          let dialogHandled = false; // Guard flag to prevent double-handling
          const dialogPromise = new Promise<'dialog'>((resolve) => {
            dialogHandler = async (dialog: any) => {
              // Prevent double-handling if multiple dialogs appear
              if (dialogHandled) {
                await dialog.accept().catch(() => {}); // Silently dismiss duplicate
                return;
              }

              const message = dialog.message();
              // Check for "File Not Found" in Korean or English
              if (message.includes('File Not Found') || message.includes('파일을 찾을 수 없습니다')) {
                dialogHandled = true;
                console.log(`[NTIS-ATTACHMENT] ⚠️  NTIS reports: ${message}`);
                await dialog.accept(); // Click "확인" button
                resolve('dialog');
              }
            };
            page.on('dialog', dialogHandler); // Use 'on' not 'once' to handle multiple dialogs
          });

          // Click the attachment link (find by text content)
          await page.click(`a:has-text("${fileName}")`);

          // Wait for either download to start OR dialog to appear
          result = await Promise.race([
            downloadPromise.then((download) => ({ type: 'download' as const, download })),
            dialogPromise.then(() => ({ type: 'dialog' as const })),
          ]);
        } catch (error: any) {
          // Handle timeout or click errors gracefully
          if (error.message?.includes('Timeout') || error.name === 'TimeoutError') {
            console.log(`[NTIS-ATTACHMENT] ⏱️  Timeout waiting for ${fileName} - skipping`);
          } else {
            console.warn(`[NTIS-ATTACHMENT] ⚠️  Error downloading ${fileName}:`, error.message);
          }
          continue; // Skip to next file
        } finally {
          // CRITICAL: Clean up dialog handler immediately (prevent memory leaks)
          if (dialogHandler) {
            page.off('dialog', dialogHandler);
          }
        }

        // Handle "File Not Found" dialog
        if (result?.type === 'dialog') {
          console.log(`[NTIS-ATTACHMENT] ✗ File not available on server: ${fileName}`);

          // CRITICAL FIX (Oct 30, 2025 - v2): ALWAYS restore page after dialog
          // Root Cause Analysis:
          // - NTIS links have onclick="fn_fileDownload('ID'); return false;"
          // - When file doesn't exist, fn_fileDownload() shows alert("File Not Found")
          // - After accepting alert, "return false" fails to prevent default href navigation
          // - Browser navigates to href="/rndgate/eg/cmm/file/download.do" → about:blank
          // - Navigation timing is unpredictable (500ms-2000ms after dialog dismiss)
          // - Next attachment click fails with timeout (download event never fires on wrong page)
          //
          // Solution v1 (FAILED): Check URL after 500ms → Navigation can happen later
          // Solution v2 (CURRENT): Always restore page after dialog → Guarantees clean state
          // Trade-off: ~1-2 seconds per missing file vs 100% reliability
          console.log(`[NTIS-ATTACHMENT] 🔄 Restoring detail page to ensure clean state...`);
          try {
            await page.goto(detailPageUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await page.waitForTimeout(1000); // Allow page to stabilize
            console.log(`[NTIS-ATTACHMENT] ✓ Detail page restored`);
          } catch (error: any) {
            console.warn(`[NTIS-ATTACHMENT] ⚠️  Failed to restore page: ${error.message}`);
            // Continue anyway - deduplication ensures we won't retry same file
          }

          continue; // Skip to next file
        }

        // Verify download succeeded
        if (!result || result.type !== 'download') {
          console.log(`[NTIS-ATTACHMENT] ⚠️  No download or dialog for ${fileName} - skipping`);
          continue;
        }

        // Download succeeded - proceed with extraction
        const download = result.download;

        // Save to temporary buffer
        const fileBuffer = await download.createReadStream().then((stream) => {
          return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
          });
        });

        console.log(`[NTIS-ATTACHMENT] Downloaded ${fileName} (${fileBuffer.length} bytes)`);

        // Extract text from downloaded file (LibreOffice handles HWP conversion automatically)
        const extractedText = await extractTextFromAttachment(
          fileName,
          fileBuffer
        );

        if (extractedText && extractedText.length > 0) {
          combinedText += extractedText + '\n\n';
          processedCount++;
          console.log(`[NTIS-ATTACHMENT] ✓ Extracted ${extractedText.length} characters from ${fileName}`);
        } else {
          console.log(`[NTIS-ATTACHMENT] ✗ No text extracted from ${fileName}`);
        }
      } catch (error: any) {
        console.warn(`[NTIS-ATTACHMENT] Failed to process ${fileName}:`, error.message);
        // Continue with next file on error
      }
    }

    console.log(
      `[NTIS-ATTACHMENT] Processed ${processedCount}/${filesToProcess.length} attachments, ` +
      `extracted ${combinedText.length} total characters`
    );

    // Return first 10,000 characters (sufficient for keyword extraction)
    return combinedText.substring(0, 10000).trim();
  } catch (error: any) {
    console.error('[NTIS-ATTACHMENT] Fatal error processing attachments:', error.message);
    return '';
  }
}

/**
 * Extract keywords from program title, description, ministry, agency defaults, and attachments
 *
 * Strategy:
 * 1. Get combined keywords from ministry + agency (e.g., MSIT + KHIDI → ['ICT', '과학기술', '의료', '바이오'])
 * 2. Extract technology terms from title (captured in page title element)
 * 3. Extract domain keywords from description (first 500 chars)
 * 4. Extract keywords from attachment text (PDF/HWP/HWPX content)
 * 5. Deduplicate and return top 20 keywords
 */
async function extractKeywords(
  page: Page,
  ministry: string | null,
  announcingAgency: string | null,
  descriptionText: string,
  attachmentText: string
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

  // 4. Extract from attachment text (if available)
  if (attachmentText && attachmentText.length > 0) {
    const attachmentKeywords = extractKeywordsFromAttachmentText(attachmentText);
    attachmentKeywords.forEach(keyword => keywords.add(keyword));

    if (attachmentKeywords.length > 0) {
      console.log(`[NTIS-KEYWORDS] Added ${attachmentKeywords.length} keywords from attachments`);
    }
  }

  // Convert Set to Array and return top 20 keywords (increased from 15 to accommodate attachment keywords)
  return Array.from(keywords).slice(0, 20);
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
    allowedBusinessStructures: null,
    attachmentUrls: [],
    trlInferred: false,
  };
}
