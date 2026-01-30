/**
 * bizinfo.go.kr Detail Page Scraper
 *
 * Fetches and parses bizinfo.go.kr detail pages to extract:
 *   1. Structured announcement text (사업개요, 지원대상, etc.)
 *   2. 본문출력파일 download URL (getImageFile pattern)
 *   3. 해시태그 (hashtags)
 *
 * Design:
 * - HTTP GET + cheerio (no Playwright) — pages are server-side rendered
 * - Rate limiting: 1 request/second, configurable batch pause
 * - Reuses attachment-parser for downloaded 공고문 text extraction
 *
 * HTML Structure (bizinfo.go.kr):
 *   div.view_cont > ul > li > span.s_title + div.txt
 *   div.attached_file_list > a[href*=getImageFile] (download URL)
 *   div.hashtags_modal table td span (hashtags with # prefix)
 */

import * as cheerio from 'cheerio';
import { extractTextFromAttachment } from '../scraping/utils/attachment-parser';

// ============================================================================
// Types
// ============================================================================

export interface BizinfoDetailResult {
  pageText: string;               // Combined text from HTML fields
  documentText: string | null;    // Extracted text from downloaded 공고문
  documentFileName: string | null;
  tags: string[];
  downloadUrl: string | null;     // 본문출력파일 URL
  scrapedAt: Date;
  fields: Record<string, string>; // Individual parsed fields (사업개요, 지원대상, etc.)
}

export interface BizinfoScrapeError {
  programId: string;
  url: string;
  error: string;
}

// ============================================================================
// Configuration
// ============================================================================

const BIZINFO_BASE_URL = 'https://www.bizinfo.go.kr';
const FETCH_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Labels to extract from the detail page (span.s_title text) */
const TARGET_LABELS = [
  '사업개요',
  '지원대상',
  '지원내용',
  '신청기간',
  '사업신청 방법',
  '문의처',
  '소관부처·지자체',
  '사업수행기관',
  '조기마감 사유',
  '사업신청 사이트',
];

// ============================================================================
// Main Scraper Function
// ============================================================================

/**
 * Scrape a bizinfo.go.kr detail page to extract announcement text, tags, and document URL.
 *
 * @param detailUrl - Full bizinfo.go.kr detail page URL
 * @param programId - Program ID for logging
 * @param options - Optional: whether to download 공고문 file
 * @returns Parsed detail result or null on failure
 */
export async function scrapeBizinfoDetailPage(
  detailUrl: string,
  programId: string,
  options: { downloadDocument?: boolean } = {}
): Promise<BizinfoDetailResult | null> {
  const { downloadDocument = false } = options;

  // Step 1: Fetch the HTML page
  const html = await fetchDetailPage(detailUrl);
  if (!html) return null;

  // Step 2: Parse HTML with cheerio
  const $ = cheerio.load(html);

  // Step 3: Extract structured fields from view_cont section
  const fields = extractFields($);

  // Step 4: Build combined page text
  const pageText = buildPageText(fields);

  // Step 5: Extract hashtags from modal
  const tags = extractTags($);

  // Step 6: Extract 본문출력파일 download URL
  const { downloadUrl, fileName: documentFileName } = extractDownloadUrl($);

  // Step 7: Optionally download and extract text from 공고문
  let documentText: string | null = null;
  if (downloadDocument && downloadUrl) {
    documentText = await downloadAndExtractDocument(downloadUrl, documentFileName);
  }

  return {
    pageText,
    documentText,
    documentFileName,
    tags,
    downloadUrl,
    scrapedAt: new Date(),
    fields,
  };
}

// ============================================================================
// HTML Fetching
// ============================================================================

/**
 * Fetch detail page HTML via HTTP GET
 */
async function fetchDetailPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      console.error(`[BizinfoScraper] HTTP ${response.status} for ${url}`);
      return null;
    }

    return await response.text();
  } catch (error: any) {
    console.error(`[BizinfoScraper] Fetch error for ${url}: ${error.message}`);
    return null;
  }
}

// ============================================================================
// HTML Parsing
// ============================================================================

/**
 * Extract structured fields from the view_cont section.
 *
 * HTML pattern:
 *   <li>
 *     <span class="s_title">사업개요</span>
 *     <div class="txt">...content...</div>
 *   </li>
 */
function extractFields($: cheerio.CheerioAPI): Record<string, string> {
  const fields: Record<string, string> = {};

  $('div.view_cont ul li').each((_, li) => {
    const $li = $(li);
    const label = $li.find('span.s_title').text().trim();
    if (!label) return;

    // Check if this is a target label
    const matchedLabel = TARGET_LABELS.find((t) => label.includes(t) || t.includes(label));
    if (!matchedLabel) return;

    const $txt = $li.find('div.txt');

    // For 사업개요, preserve inner HTML structure for richer text
    let value: string;
    if (label.includes('사업개요') || label.includes('지원대상') || label.includes('지원내용')) {
      // Get text content from <p> tags and other elements, preserving line breaks
      value = $txt
        .find('p, br, div, span, li')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t: string) => t.length > 0)
        .join('\n');

      // Fallback to plain text if no structured elements found
      if (!value) {
        value = $txt.text().trim();
      }
    } else {
      value = $txt.text().trim();
    }

    if (value) {
      fields[label] = value;
    }
  });

  return fields;
}

/**
 * Build combined text from all extracted fields.
 * Format: "[Label]: [Value]" per line, suitable for LLM processing.
 */
function buildPageText(fields: Record<string, string>): string {
  const sections: string[] = [];

  for (const label of TARGET_LABELS) {
    // Find the field that matches this label
    const matchedKey = Object.keys(fields).find(
      (k) => k.includes(label) || label.includes(k)
    );
    if (matchedKey && fields[matchedKey]) {
      sections.push(`[${matchedKey}]\n${fields[matchedKey]}`);
    }
  }

  return sections.join('\n\n');
}

/**
 * Extract hashtags from the modal's static HTML table.
 *
 * HTML pattern:
 *   div.hashtags_modal .hashtagInfo_list table td span → "#태그명"
 */
function extractTags($: cheerio.CheerioAPI): string[] {
  const tags: string[] = [];

  // Primary: static hashtag table in modal
  $('.hashtags_modal .hashtagInfo_list table td span').each((_, el) => {
    const tag = $(el).text().trim();
    if (tag.startsWith('#') && tag.length > 1) {
      tags.push(tag.substring(1)); // Remove # prefix for storage
    }
  });

  // Fallback: parse hashtags from inline JavaScript if modal not found
  if (tags.length === 0) {
    const html = $.html();
    const jsTagRegex = /<span>#([^<]+)<\/span>/g;
    let match;
    while ((match = jsTagRegex.exec(html)) !== null) {
      const tag = match[1].trim();
      if (tag && tag !== '해시태그' && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  return tags;
}

/**
 * Extract 본문출력파일 download URL and filename.
 *
 * HTML pattern:
 *   div.attached_file_list a[href*=getImageFile] → download URL
 *   div.attached_file_list div.file_name → filename
 */
function extractDownloadUrl($: cheerio.CheerioAPI): {
  downloadUrl: string | null;
  fileName: string | null;
} {
  const $fileSection = $('div.attached_file_list');
  if ($fileSection.length === 0) {
    return { downloadUrl: null, fileName: null };
  }

  // Find download link (getImageFile pattern)
  let downloadUrl: string | null = null;
  $fileSection.find('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('getImageFile')) {
      // Strip jsessionid from URL
      const cleanUrl = href.replace(/;jsessionid=[^?]+/, '');
      downloadUrl = cleanUrl.startsWith('http')
        ? cleanUrl
        : `${BIZINFO_BASE_URL}${cleanUrl}`;
    }
  });

  // Extract filename
  const fileName = $fileSection.find('div.file_name').first().text().trim() || null;

  return { downloadUrl, fileName };
}

// ============================================================================
// Document Download & Text Extraction
// ============================================================================

/**
 * Download 공고문 file from getImageFile URL and extract text.
 * Reuses the existing attachment-parser infrastructure.
 */
async function downloadAndExtractDocument(
  downloadUrl: string,
  fileName: string | null
): Promise<string | null> {
  try {
    const response = await fetch(downloadUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.error(`[BizinfoScraper] Download HTTP ${response.status}: ${downloadUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      console.error('[BizinfoScraper] Downloaded file is empty');
      return null;
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      console.error(`[BizinfoScraper] File too large: ${buffer.length} bytes`);
      return null;
    }

    // Determine filename for text extraction
    const resolvedFileName = fileName || detectFileName(response, buffer);

    const text = await extractTextFromAttachment(resolvedFileName, buffer);
    return text && text.length >= 100 ? text : null;
  } catch (error: any) {
    console.error(`[BizinfoScraper] Document extraction error: ${error.message}`);
    return null;
  }
}

/**
 * Detect filename from response headers or magic bytes.
 */
function detectFileName(response: Response, buffer: Buffer): string {
  // Try Content-Disposition header
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";\n]+)/i);
    if (match) {
      return decodeURIComponent(match[1].trim());
    }
  }

  // Try Content-Type
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType === 'application/pdf') return 'document.pdf';
  if (contentType?.includes('hwp')) return 'document.hwp';

  // Magic byte detection
  if (buffer.length >= 4) {
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'document.pdf';
    }
    if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
      return 'document.hwp';
    }
    if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
      return 'document.hwpx';
    }
  }

  return 'document.bin';
}

// ============================================================================
// Utility: Rate-limited batch processing
// ============================================================================

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
