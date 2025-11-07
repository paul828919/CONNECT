/**
 * Scraping Utilities
 *
 * Helper functions for agency scraping:
 * - Rate limiting
 * - robots.txt parsing
 * - Content hashing
 * - Date parsing (Korean formats)
 */

import * as crypto from 'crypto';

/**
 * Rate Limiter
 * Ensures respectful scraping with configurable delays
 */
export class RateLimiter {
  private delay: number;
  private lastRequest: number = 0;

  constructor(requestsPerMinute: number = 10) {
    this.delay = (60 / requestsPerMinute) * 1000; // Convert to milliseconds
  }

  /**
   * Throttle requests to respect rate limits
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.delay) {
      const waitTime = this.delay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequest = Date.now();
  }

  /**
   * Random delay (appears more human-like)
   */
  async randomDelay(minMs: number = 5000, maxMs: number = 8000): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Generate SHA-256 content hash for change detection
 */
export function generateContentHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Generate program content hash from key fields
 */
export function generateProgramHash(data: {
  agencyId: string;
  title: string;
  announcementUrl: string;
}): string {
  const hashInput = `${data.agencyId}|${data.title}|${data.announcementUrl}`;
  return generateContentHash(hashInput);
}

/**
 * Parse Korean date formats
 * Examples:
 *  - "2024-01-15"
 *  - "2024.01.15"
 *  - "2024년 1월 15일"
 *  - "2024/01/15"
 *  - "2025-09-23 15시" (with time)
 *  - "2024.12.31 23시 59분" (with hours and minutes)
 *  - "2025.9.23" (NTIS format with single-digit months)
 */
export function parseKoreanDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove time components (시, 분) and everything after them
  // This allows us to extract just the date portion
  let cleaned = dateStr
    .replace(/\s*\d+시.*$/g, '') // Remove "15시" or "23시 59분" at end
    .trim();

  // PRIORITY 1: NTIS format (YYYY.MM.DD or YYYY-MM-DD) with explicit validation
  // Match patterns like "2025.9.23", "2025.09.23", "2025-9-23", "2025-09-23"
  const ntisPattern = /^(\d{4})[.-](\d{1,2})[.-](\d{1,2})$/;
  const ntisMatch = cleaned.match(ntisPattern);

  if (ntisMatch) {
    const year = parseInt(ntisMatch[1]);
    const month = parseInt(ntisMatch[2]);
    const day = parseInt(ntisMatch[3]);

    // Validate year range (2020-2030) - realistic government funding timeline
    if (year < 2020 || year > 2030) {
      return null;
    }

    // Validate month range (1-12)
    if (month < 1 || month > 12) {
      return null;
    }

    // Validate day range (1-31)
    if (day < 1 || day > 31) {
      return null;
    }

    // Create date and verify it's valid (handles Feb 30, etc.)
    const parsedDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    if (
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day
    ) {
      return parsedDate;
    }

    return null;
  }

  // PRIORITY 2: Korean traditional formats (년/월/일)
  cleaned = cleaned
    .replace(/년/g, '-')
    .replace(/월/g, '-')
    .replace(/일/g, '')
    .replace(/\./g, '-')
    .replace(/\//g, '-')
    .trim();

  // Parse standard formats
  const parsedDate = new Date(cleaned);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return null;
}

/**
 * Extract budget amount from Korean text
 * Examples:
 *  - "10억원" → 1000000000
 *  - "5백만원" → 5000000
 *  - "1.5억원" → 150000000
 */
export function parseBudgetAmount(text: string): number | null {
  if (!text) return null;

  // Remove spaces and commas
  const cleaned = text.replace(/,/g, '').replace(/\s/g, '');

  // Match patterns like "10억원", "5백만원", "1.5억원"
  const pattern = /([\d.]+)(조|억|천만|백만|만)?원?/;
  const match = cleaned.match(pattern);

  if (!match) return null;

  const number = parseFloat(match[1]);
  const unit = match[2];

  let multiplier = 1;
  switch (unit) {
    case '조':
      multiplier = 1000000000000; // 1 trillion
      break;
    case '억':
      multiplier = 100000000; // 100 million
      break;
    case '천만':
      multiplier = 10000000; // 10 million
      break;
    case '백만':
      multiplier = 1000000; // 1 million
      break;
    case '만':
      multiplier = 10000; // 10 thousand
      break;
  }

  return Math.round(number * multiplier);
}

/**
 * Extract investment requirement amount from Korean text
 * Examples:
 *  - "투자 유치 20억원 이상" → 2000000000
 *  - "투자금 5억원 이상" → 500000000
 *  - "투자 실적 10억원 이상" → 1000000000
 *  - "자기자본 3억원 이상" → 300000000
 *
 * @returns Minimum investment amount in Korean won, or null if not found
 */
export function extractInvestmentRequirement(text: string): number | null {
  if (!text) return null;

  // Remove spaces and normalize text
  const cleaned = text.replace(/\s+/g, ' ');

  // ================================================================
  // ✅ ENHANCED FIX (2025-11-08): Proximity-Based Section Detection
  // ================================================================
  // PROBLEM: DCP announcements have TWO types of investment amounts:
  // 1. Private investment requirement (20억원) - in "지원조건" (eligibility section)
  // 2. Government funding provided (36억원) - in "지원내용" (funding section)
  //
  // PREVIOUS APPROACH: Document-wide section detection
  // - Checked if ENTIRE text contains "지원조건" headers
  // - Worked for structured announcements, failed for HTML/description
  //
  // NEW APPROACH: Proximity-based context analysis
  // - For EACH investment match, examine surrounding 200 characters
  // - Score based on nearby keywords (eligibility vs funding)
  // - Only extract if clearly in funding context
  // ================================================================

  // Define context keywords for scoring
  const ELIGIBILITY_KEYWORDS = [
    '지원조건',    // Support conditions
    '신청조건',    // Application conditions
    '신청자격',    // Application qualifications
    '참여요건',    // Participation requirements
    '지원대상',    // Support target
    '선정요건',    // Selection requirements
    '참여자격',    // Participation qualifications
    '대상기업',    // Target companies
    '필수요건',    // Required conditions
  ];

  const FUNDING_KEYWORDS = [
    '지원내용',    // Support content (what's provided)
    '지원금액',    // Support amount
    '지원규모',    // Support scale
    '과제당',      // Per project
    '총사업비',    // Total project cost
    '정부출연금',  // Government contribution
  ];

  // Investment-related keywords in Korean
  const investmentPatterns = [
    // Pattern 1: "투자 유치 20억원 이상"
    /투자\s*유치\s*([\d.]+)\s*(조|억|천만|백만|만)\s*원?\s*이상/,
    // Pattern 2: "투자금 5억원 이상"
    /투자금\s*([\d.]+)\s*(조|억|천만|백만|만)\s*원?\s*이상/,
    // Pattern 3: "투자 실적 10억원 이상"
    /투자\s*실적\s*([\d.]+)\s*(조|억|천만|백만|만)\s*원?\s*이상/,
    // Pattern 4: "자기자본 3억원 이상"
    /자기자본\s*([\d.]+)\s*(조|억|천만|백만|만)\s*원?\s*이상/,
    // Pattern 5: "자본금 2억원 이상"
    /자본금\s*([\d.]+)\s*(조|억|천만|백만|만)\s*원?\s*이상/,
  ];

  for (const pattern of investmentPatterns) {
    const match = cleaned.match(pattern);

    if (match) {
      const matchIndex = cleaned.indexOf(match[0]);
      if (matchIndex === -1) continue; // Safety check

      // Examine 200 characters before and after the match
      const contextStart = Math.max(0, matchIndex - 200);
      const contextEnd = Math.min(cleaned.length, matchIndex + match[0].length + 200);
      const context = cleaned.substring(contextStart, contextEnd);

      // ✅ FIX 1: Skip if in example/reference context
      const isExample = /예시|예제|예:|참고:|예를\s*들어|예시로|샘플|sample|example/i.test(context);
      if (isExample) {
        continue;
      }

      // ✅ FIX 2: Proximity-based context scoring
      // Count eligibility vs funding keywords in surrounding context
      let eligibilityScore = 0;
      let fundingScore = 0;

      for (const keyword of ELIGIBILITY_KEYWORDS) {
        if (context.includes(keyword)) {
          eligibilityScore += 1;
        }
      }

      for (const keyword of FUNDING_KEYWORDS) {
        if (context.includes(keyword)) {
          fundingScore += 1;
        }
      }

      // Decision logic (INVERTED - Fixed 2025-11-08):
      // - If funding keywords found AND no eligibility keywords → SKIP (funding description)
      // - If eligibility keywords found → EXTRACT (legitimate requirement)
      // - If neither found → EXTRACT (default to extraction for backward compatibility)
      //
      // RATIONALE:
      // - Eligibility sections describe what APPLICANTS must have (extract these ✅)
      // - Funding sections describe what the PROGRAM provides (skip these ❌)
      if (fundingScore > 0 && eligibilityScore === 0) {
        // This match is in a funding description section (what program provides)
        continue; // Skip this match, try next pattern
      }

      // Extract the investment amount
      const number = parseFloat(match[1]);
      const unit = match[2];

      let multiplier = 1;
      switch (unit) {
        case '조':
          multiplier = 1000000000000; // 1 trillion
          break;
        case '억':
          multiplier = 100000000; // 100 million
          break;
        case '천만':
          multiplier = 10000000; // 10 million
          break;
        case '백만':
          multiplier = 1000000; // 1 million
          break;
        case '만':
          multiplier = 10000; // 10 thousand
          break;
      }

      return Math.round(number * multiplier);
    }
  }

  return null;
}

/**
 * Determine target type from Korean text
 */
export function determineTargetType(text: string): 'COMPANY' | 'RESEARCH_INSTITUTE' | 'BOTH' {
  const lowerText = text.toLowerCase();

  const hasCompany = /기업|중소|벤처|스타트업/.test(text);
  const hasResearchInstitute = /연구소|연구기관|대학|출연연/.test(text);

  if (hasCompany && hasResearchInstitute) return 'BOTH';
  if (hasCompany) return 'COMPANY';
  if (hasResearchInstitute) return 'RESEARCH_INSTITUTE';

  // Default to BOTH if unclear
  return 'BOTH';
}

/**
 * Clean HTML text (remove tags, extra spaces)
 */
export function cleanHtmlText(html: string): string {
  if (!html) return '';

  return (
    html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp;
      .replace(/&amp;/g, '&') // Replace &amp;
      .replace(/&lt;/g, '<') // Replace &lt;
      .replace(/&gt;/g, '>') // Replace &gt;
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
  );
}

/**
 * Validate if URL is absolute or relative
 */
export function normalizeUrl(url: string, baseUrl: string): string {
  if (!url) return '';

  // If already absolute URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If relative URL, prepend base URL
  if (url.startsWith('/')) {
    return baseUrl + url;
  }

  // If relative without leading slash, prepend base URL with slash
  return `${baseUrl}/${url}`;
}

/**
 * Extract TRL range from text with confidence tracking
 *
 * Detection strategies:
 * 1. Explicit: Direct TRL mentions (e.g., "TRL 1-3", "기술성숙도 4-6")
 * 2. Inferred: Korean research stage keywords (기초연구, 응용연구, 실용화)
 *
 * @returns TRL range with confidence level, or null if not detected
 */
export function extractTRLRange(text: string): {
  minTRL: number;
  maxTRL: number;
  confidence: 'explicit' | 'inferred'
} | null {
  if (!text) return null;

  // ============================================================================
  // Strategy 1: Explicit TRL Detection (HIGH CONFIDENCE)
  // ============================================================================

  // Pattern 1: "TRL 1-3", "TRL 4~6", "TRL1-3"
  const explicitPattern = /TRL\s*(\d)\s*[-~]\s*(\d)/i;
  const explicitMatch = text.match(explicitPattern);

  if (explicitMatch) {
    const minTRL = parseInt(explicitMatch[1]);
    const maxTRL = parseInt(explicitMatch[2]);

    if (minTRL >= 1 && minTRL <= 9 && maxTRL >= 1 && maxTRL <= 9 && minTRL <= maxTRL) {
      return { minTRL, maxTRL, confidence: 'explicit' };
    }
  }

  // Pattern 2: "기술성숙도 7-9", "기술성숙도 4~6"
  const koreanPattern = /기술성숙도\s*(\d)\s*[-~]\s*(\d)/;
  const koreanMatch = text.match(koreanPattern);

  if (koreanMatch) {
    const minTRL = parseInt(koreanMatch[1]);
    const maxTRL = parseInt(koreanMatch[2]);

    if (minTRL >= 1 && minTRL <= 9 && maxTRL >= 1 && maxTRL <= 9 && minTRL <= maxTRL) {
      return { minTRL, maxTRL, confidence: 'explicit' };
    }
  }

  // Pattern 3: Single TRL value "TRL 5", "TRL5" → interpret as minTRL=maxTRL
  const singlePattern = /TRL\s*(\d)/i;
  const singleMatch = text.match(singlePattern);

  if (singleMatch) {
    const trl = parseInt(singleMatch[1]);

    if (trl >= 1 && trl <= 9) {
      return { minTRL: trl, maxTRL: trl, confidence: 'explicit' };
    }
  }

  // ============================================================================
  // Strategy 2: Implicit TRL Inference (MEDIUM CONFIDENCE)
  // ============================================================================

  // Implicit inference from Korean research stage keywords
  // Based on Korean R&D funding terminology standards
  // Enhanced Phase 8: More aggressive inference patterns for 70%+ extraction rate

  // TRL 1-3: Basic Research (기초연구)
  // - Observational/theoretical research
  // - Laboratory proof-of-concept
  // Keywords: 기초연구, 원천기술, 이론연구, 탐색연구, 개념연구, 아이디어
  // Enhancement: Added 선행연구 (preliminary research), 핵심원천기술 (core fundamental technology)
  if (/기초연구|원천기술|이론연구|기본원리|설계기준|설계연구|기초(?!.*응용)|탐색연구|기반연구|개념연구|원리검증|개념증명|아이디어.*발굴|초기.*단계|기초.*기술|선행연구|핵심원천기술|원천.*개발/i.test(text)) {
    return { minTRL: 1, maxTRL: 3, confidence: 'inferred' };
  }

  // TRL 4-6: Applied Research (응용연구)
  // - Component validation
  // - Laboratory/relevant environment validation
  // Keywords: 응용연구, 개발연구, 시제품, 프로토타입, 실험실, 검증, 파일럿
  if (/응용연구|응용(?!.*기초)|개발연구|시제품|프로토타입|중간단계|시험개발|기술개발|연구개발|실험실.*검증|시험제작|테스트베드|파일럿.*테스트|시범.*사업|검증.*단계|개발.*단계/i.test(text)) {
    return { minTRL: 4, maxTRL: 6, confidence: 'inferred' };
  }

  // TRL 7-9: Commercialization (실용화/사업화)
  // - System prototype demonstration
  // - System proven in operational environment
  // - Actual system proven through operations
  // Keywords: 실용화, 사업화, 상용화, 시장진입, 양산, 창업, 제조, 판매, 수탁연구, 위탁연구
  if (/실용화|사업화|상용화|시장진입|양산|제품화|실증|사업화.*지원|창업.*지원|시장.*출시|상업.*생산|제조.*기반|판매.*확대|글로벌.*진출|수탁연구|위탁연구/i.test(text)) {
    return { minTRL: 7, maxTRL: 9, confidence: 'inferred' };
  }

  // ============================================================================
  // Strategy 3: Aggressive Fallback Inference (LOW-MEDIUM CONFIDENCE)
  // ============================================================================

  // Fallback 1: Generic "개발" (development) without context → Applied Research (TRL 4-6)
  // Most common case for unspecified R&D programs
  if (/개발(?!연구)|기술.*개발|제품.*개발|시스템.*개발/i.test(text)) {
    return { minTRL: 4, maxTRL: 6, confidence: 'inferred' };
  }

  // Fallback 2: Generic "연구" (research) without context → Applied Research (TRL 4-6)
  // Default to middle range (most statistically common)
  if (/연구(?!개발|기초|원천|이론)|R&D|기술.*연구/i.test(text)) {
    return { minTRL: 4, maxTRL: 6, confidence: 'inferred' };
  }

  // Fallback 3: "지원사업" or "지원과제" (support program/project) → Applied Research (TRL 4-6)
  // Most government funding targets applied research
  if (/지원.*사업|지원.*과제|과제.*지원/i.test(text)) {
    return { minTRL: 4, maxTRL: 6, confidence: 'inferred' };
  }

  // ============================================================================
  // No TRL detected
  // ============================================================================

  return null;
}

/**
 * Generate random user agent (for fallback)
 */
export function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

/**
 * Check if currently peak season (January-March)
 */
export function isPeakSeason(): boolean {
  const month = new Date().getMonth() + 1; // 1-12
  return month >= 1 && month <= 3;
}

/**
 * Scroll page like a human
 */
export async function humanScroll(page: any): Promise<void> {
  const scrollSteps = 3 + Math.floor(Math.random() * 3); // 3-5 steps
  for (let i = 0; i < scrollSteps; i++) {
    await page.mouse.wheel(0, 200 + Math.random() * 100);
    await page.waitForTimeout(500 + Math.random() * 500);
  }
}

/**
 * Log scraping activity
 */
export function logScraping(
  agency: string,
  message: string,
  level: 'info' | 'warn' | 'error' = 'info'
): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${agency.toUpperCase()}]`;

  switch (level) {
    case 'error':
      console.error(`${prefix} ❌ ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ⚠️  ${message}`);
      break;
    default:
      console.log(`${prefix} ✓ ${message}`);
  }
}
