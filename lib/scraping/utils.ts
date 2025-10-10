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
 */
export function parseKoreanDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove Korean characters
  let cleaned = dateStr
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
 * Extract TRL range from text
 */
export function extractTRLRange(text: string): { minTRL: number; maxTRL: number } | null {
  if (!text) return null;

  // Match patterns like "TRL 1-3", "TRL 4~6", "기술성숙도 7-9"
  const pattern = /TRL\s*(\d)\s*[-~]\s*(\d)|기술성숙도\s*(\d)\s*[-~]\s*(\d)/i;
  const match = text.match(pattern);

  if (!match) return null;

  const minTRL = parseInt(match[1] || match[3]);
  const maxTRL = parseInt(match[2] || match[4]);

  if (minTRL >= 1 && minTRL <= 9 && maxTRL >= 1 && maxTRL <= 9 && minTRL <= maxTRL) {
    return { minTRL, maxTRL };
  }

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
