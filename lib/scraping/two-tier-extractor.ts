/**
 * Two-Tier Priority Extraction System
 *
 * Architecture: Extract fields from two data sources with intelligent fallback
 *
 * Priority 1: ANNOUNCEMENT FILES (공고문.hwp/pdf) - Authoritative source
 *   - Most reliable, contains dates, budget, TRL, eligibility
 *   - Filters out non-announcement files (신청서, 양식, 집행계획)
 *   - Confidence: HIGH
 *
 * Priority 2: DETAIL PAGE - Fallback source
 *   - Uses both rawHtml text extraction AND CSS selector extraction
 *   - Both methods come from Discovery Scraper's detailPageData
 *   - Works when announcement files missing (4% of cases)
 *   - Confidence: MEDIUM
 *
 * Key Insight: rawHtml and CSS-extracted fields (deadline, publishedAt) both
 * come from the same Discovery Scraper run - they're not separate sources,
 * just different extraction methods on the same detail page.
 *
 * Usage:
 *   const extractor = new TwoTierExtractor(jobId, detailPageData, attachmentData, extractionLogger);
 *   const deadline = await extractor.extractDeadline();
 *   const budget = await extractor.extractBudget();
 */

import { ExtractionLogger } from './extraction-logger';
import { extractBudget, extractEligibilityCriteria, extractBusinessStructures } from './parsers/ntis-announcement-parser';
import { extractTRLRange } from './utils';
import { parseKoreanDate } from './utils';

export interface DetailPageData {
  title: string;
  ministry: string | null;
  announcingAgency: string | null;
  description: string | null;
  deadline: string | null;
  publishedAt: string | null;
  attachmentUrls: string[];
  rawHtml: string;
}

export interface AttachmentData {
  filenames: string[];
  announcementFiles: Array<{ filename: string; text: string }>;
  otherFiles: Array<{ filename: string; text: string }>;
}

/**
 * Convert HTML to plain text by stripping tags
 */
function htmlToText(html: string): string {
  if (!html || html.trim().length === 0) return '';

  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ');

  return text.trim();
}

export class TwoTierExtractor {
  private jobId: string;
  private detailPageData: DetailPageData;
  private attachmentData: AttachmentData;
  private logger: ExtractionLogger;
  private rawHtmlText: string;

  constructor(
    jobId: string,
    detailPageData: DetailPageData,
    attachmentData: AttachmentData,
    logger: ExtractionLogger
  ) {
    this.jobId = jobId;
    this.detailPageData = detailPageData;
    this.attachmentData = attachmentData;
    this.logger = logger;
    this.rawHtmlText = htmlToText(detailPageData.rawHtml);
  }

  /**
   * Extract deadline with two-tier fallback
   */
  async extractDeadline(): Promise<Date | null> {
    const attemptedSources: Array<'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE'> = [];

    // Priority 1: Announcement files (if available)
    if (this.attachmentData.announcementFiles.length > 0) {
      attemptedSources.push('ANNOUNCEMENT_FILE');
      const announcementText = this.attachmentData.announcementFiles
        .map((f) => f.text)
        .join('\n\n');

      const deadline = this.extractDeadlineFromText(announcementText);
      if (deadline) {
        this.logger.logSuccess(
          'DEADLINE',
          deadline,
          'ANNOUNCEMENT_FILE',
          'HIGH',
          `From ${this.attachmentData.announcementFiles[0].filename}`
        );
        return deadline;
      }
    }

    // Priority 2: Detail page (try both rawHtml text extraction and CSS selectors)
    attemptedSources.push('DETAIL_PAGE');

    // Try rawHtml text extraction
    if (this.rawHtmlText) {
      const deadline = this.extractDeadlineFromText(this.rawHtmlText);
      if (deadline) {
        this.logger.logSuccess(
          'DEADLINE',
          deadline,
          'DETAIL_PAGE',
          'MEDIUM',
          'Extracted from detail page HTML text'
        );
        return deadline;
      }
    }

    // Try CSS-extracted deadline as fallback
    if (this.detailPageData.deadline) {
      const deadline = parseKoreanDate(this.detailPageData.deadline);
      if (deadline) {
        this.logger.logSuccess(
          'DEADLINE',
          deadline,
          'DETAIL_PAGE',
          'MEDIUM',
          'From Discovery CSS selectors'
        );
        return deadline;
      }
    }

    // All failed: Log with context
    const contextSnippet = this.rawHtmlText.substring(0, 1000);
    this.logger.logFailure(
      'DEADLINE',
      attemptedSources,
      'No deadline matched in announcement files or detail page',
      contextSnippet
    );

    return null;
  }

  /**
   * Extract publishedAt with two-tier fallback
   */
  async extractPublishedAt(): Promise<Date | null> {
    const attemptedSources: Array<'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE'> = [];

    // Priority 1: Announcement files (if available)
    if (this.attachmentData.announcementFiles.length > 0) {
      attemptedSources.push('ANNOUNCEMENT_FILE');
      const announcementText = this.attachmentData.announcementFiles
        .map((f) => f.text)
        .join('\n\n');

      const publishedAt = this.extractPublishedAtFromText(announcementText);
      if (publishedAt) {
        this.logger.logSuccess(
          'PUBLISHED_AT',
          publishedAt,
          'ANNOUNCEMENT_FILE',
          'HIGH',
          `From ${this.attachmentData.announcementFiles[0].filename}`
        );
        return publishedAt;
      }
    }

    // Priority 2: Detail page (try both rawHtml text extraction and CSS selectors)
    attemptedSources.push('DETAIL_PAGE');

    // Try rawHtml text extraction
    if (this.rawHtmlText) {
      const publishedAt = this.extractPublishedAtFromText(this.rawHtmlText);
      if (publishedAt) {
        this.logger.logSuccess(
          'PUBLISHED_AT',
          publishedAt,
          'DETAIL_PAGE',
          'MEDIUM',
          'Extracted from detail page HTML text'
        );
        return publishedAt;
      }
    }

    // Try CSS-extracted publishedAt as fallback
    if (this.detailPageData.publishedAt) {
      const publishedAt = parseKoreanDate(this.detailPageData.publishedAt);
      if (publishedAt) {
        this.logger.logSuccess(
          'PUBLISHED_AT',
          publishedAt,
          'DETAIL_PAGE',
          'MEDIUM',
          'From Discovery CSS selectors'
        );
        return publishedAt;
      }
    }

    // All failed: Log with context
    const contextSnippet = this.rawHtmlText.substring(0, 1000);
    this.logger.logFailure(
      'PUBLISHED_AT',
      attemptedSources,
      'No publishedAt matched in announcement files or detail page',
      contextSnippet
    );

    return null;
  }

  /**
   * Extract applicationStart with two-tier fallback
   */
  async extractApplicationStart(): Promise<Date | null> {
    const attemptedSources: Array<'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE'> = [];

    // Priority 1: Announcement files (if available)
    if (this.attachmentData.announcementFiles.length > 0) {
      attemptedSources.push('ANNOUNCEMENT_FILE');
      const announcementText = this.attachmentData.announcementFiles
        .map((f) => f.text)
        .join('\n\n');

      const applicationStart = this.extractApplicationStartFromText(announcementText);
      if (applicationStart) {
        this.logger.logSuccess(
          'APPLICATION_START',
          applicationStart,
          'ANNOUNCEMENT_FILE',
          'HIGH',
          `From ${this.attachmentData.announcementFiles[0].filename}`
        );
        return applicationStart;
      }
    }

    // Priority 2: Detail page rawHtml text extraction
    attemptedSources.push('DETAIL_PAGE');

    if (this.rawHtmlText) {
      const applicationStart = this.extractApplicationStartFromText(this.rawHtmlText);
      if (applicationStart) {
        this.logger.logSuccess(
          'APPLICATION_START',
          applicationStart,
          'DETAIL_PAGE',
          'MEDIUM',
          'Extracted from detail page HTML text'
        );
        return applicationStart;
      }
    }

    // All failed: Log with context
    const contextSnippet = this.rawHtmlText.substring(0, 1000);
    this.logger.logFailure(
      'APPLICATION_START',
      attemptedSources,
      'No applicationStart matched in announcement files or detail page',
      contextSnippet
    );

    return null;
  }

  /**
   * Extract budget with two-tier fallback
   */
  async extractBudget(): Promise<number | null> {
    const attemptedSources: Array<'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE'> = [];

    // Priority 1: Announcement files (if available)
    if (this.attachmentData.announcementFiles.length > 0) {
      attemptedSources.push('ANNOUNCEMENT_FILE');
      const announcementText = this.attachmentData.announcementFiles
        .map((f) => f.text)
        .join('\n\n');

      const budget = extractBudget(announcementText);
      if (budget !== null) {
        // P3 Enhancement: Validate budget against title context
        this.validateBudgetAgainstTitle(budget);

        this.logger.logSuccess(
          'BUDGET',
          budget,
          'ANNOUNCEMENT_FILE',
          'HIGH',
          `From ${this.attachmentData.announcementFiles[0].filename}`
        );
        return budget;
      }
    }

    // Priority 2: Detail page (rawHtml and description)
    attemptedSources.push('DETAIL_PAGE');

    // Try rawHtml text extraction
    if (this.rawHtmlText) {
      const budget = extractBudget(this.rawHtmlText);
      if (budget !== null) {
        // P3 Enhancement: Validate budget against title context
        this.validateBudgetAgainstTitle(budget);

        this.logger.logSuccess('BUDGET', budget, 'DETAIL_PAGE', 'MEDIUM', 'Extracted from detail page HTML');
        return budget;
      }
    }

    // Try description as fallback
    if (this.detailPageData.description) {
      const budget = extractBudget(this.detailPageData.description);
      if (budget !== null) {
        // P3 Enhancement: Validate budget against title context
        this.validateBudgetAgainstTitle(budget);

        this.logger.logSuccess(
          'BUDGET',
          budget,
          'DETAIL_PAGE',
          'MEDIUM',
          'From Discovery description field'
        );
        return budget;
      }
    }

    // All failed: Log with context snippet
    const contextSnippet = this.rawHtmlText.substring(0, 1000);
    this.logger.logFailure(
      'BUDGET',
      attemptedSources,
      'No budget matched in announcement files or detail page',
      contextSnippet
    );

    return null;
  }

  /**
   * Extract TRL range with two-tier fallback
   */
  async extractTRL(): Promise<{ minTRL: number; maxTRL: number } | null> {
    const attemptedSources: Array<'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE'> = [];

    // Priority 1: Announcement files (if available)
    if (this.attachmentData.announcementFiles.length > 0) {
      attemptedSources.push('ANNOUNCEMENT_FILE');
      const announcementText = this.attachmentData.announcementFiles
        .map((f) => f.text)
        .join('\n\n');

      const trlRange = extractTRLRange(announcementText);
      if (trlRange) {
        this.logger.logSuccess(
          'TRL_RANGE',
          `${trlRange.minTRL}-${trlRange.maxTRL}`,
          'ANNOUNCEMENT_FILE',
          'HIGH',
          `From ${this.attachmentData.announcementFiles[0].filename}`
        );
        return trlRange;
      }
    }

    // Priority 2: Detail page (rawHtml and description)
    attemptedSources.push('DETAIL_PAGE');

    // Try rawHtml text extraction
    if (this.rawHtmlText) {
      const trlRange = extractTRLRange(this.rawHtmlText);
      if (trlRange) {
        this.logger.logSuccess(
          'TRL_RANGE',
          `${trlRange.minTRL}-${trlRange.maxTRL}`,
          'DETAIL_PAGE',
          'MEDIUM',
          'Extracted from detail page HTML'
        );
        return trlRange;
      }
    }

    // Try description as fallback
    if (this.detailPageData.description) {
      const trlRange = extractTRLRange(this.detailPageData.description);
      if (trlRange) {
        this.logger.logSuccess(
          'TRL_RANGE',
          `${trlRange.minTRL}-${trlRange.maxTRL}`,
          'DETAIL_PAGE',
          'MEDIUM',
          'From Discovery description field'
        );
        return trlRange;
      }
    }

    // All failed: Log with context
    const contextSnippet = this.rawHtmlText.substring(0, 1000);
    this.logger.logFailure(
      'TRL_RANGE',
      attemptedSources,
      'No TRL pattern matched in announcement files or detail page',
      contextSnippet
    );

    return null;
  }

  /**
   * Extract eligibility criteria (prioritizes announcement files)
   */
  async extractEligibility(): Promise<any> {
    // Prioritize announcement files, fallback to detail page
    const announcementText =
      this.attachmentData.announcementFiles.length > 0
        ? this.attachmentData.announcementFiles.map((f) => f.text).join('\n\n')
        : `${this.detailPageData.description || ''}\n\n${this.rawHtmlText}`;

    const eligibility = extractEligibilityCriteria(announcementText);

    if (eligibility) {
      this.logger.logSuccess(
        'ELIGIBILITY',
        JSON.stringify(eligibility),
        this.attachmentData.announcementFiles.length > 0 ? 'ANNOUNCEMENT_FILE' : 'DETAIL_PAGE',
        this.attachmentData.announcementFiles.length > 0 ? 'HIGH' : 'MEDIUM',
        'Extracted eligibility criteria'
      );
    }

    return eligibility;
  }

  /**
   * Extract business structures (prioritizes announcement files)
   */
  async extractBusinessStructures(): Promise<Array<'CORPORATION' | 'SOLE_PROPRIETOR'>> {
    // Prioritize announcement files, fallback to detail page
    const announcementText =
      this.attachmentData.announcementFiles.length > 0
        ? this.attachmentData.announcementFiles.map((f) => f.text).join('\n\n')
        : `${this.detailPageData.description || ''}\n\n${this.rawHtmlText}`;

    return extractBusinessStructures(announcementText);
  }

  /**
   * Helper: Extract deadline from text using synonym matching
   */
  private extractDeadlineFromText(text: string): Date | null {
    const deadlineSynonyms = [
      '마감일',
      '신청마감일',
      '지원마감일',
      '모집마감일',
      '접수마감일',
      '신청기한',
      '접수기한',
      '제출마감',
    ];

    for (const synonym of deadlineSynonyms) {
      const patterns = [
        new RegExp(`${synonym}\\s*:\\s*(\\d{4}[.-]\\d{1,2}[.-]\\d{1,2})`, 'i'),
        new RegExp(`${synonym}\\s*:\\s*(\\d{4}년\\s*\\d{1,2}월\\s*\\d{1,2}일)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const parsed = parseKoreanDate(match[1]);
          if (parsed) {
            return parsed;
          }
        }
      }
    }

    return null;
  }

  /**
   * Helper: Extract publishedAt from text using synonym matching
   */
  private extractPublishedAtFromText(text: string): Date | null {
    const patterns = [
      /공고일\s*:\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/i,
      /공고일\s*:\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsed = parseKoreanDate(match[1]);
        if (parsed && parsed <= new Date()) {
          return parsed;
        }
      }
    }

    return null;
  }

  /**
   * Helper: Extract applicationStart from text using synonym matching
   */
  private extractApplicationStartFromText(text: string): Date | null {
    const applicationStartSynonyms = [
      '접수일',
      '신청일',
      '모집일',
      '접수시작일',
      '신청시작일',
    ];

    for (const synonym of applicationStartSynonyms) {
      const patterns = [
        new RegExp(`${synonym}\\s*:\\s*(\\d{4}[.-]\\d{1,2}[.-]\\d{1,2})`, 'i'),
        new RegExp(`${synonym}\\s*:\\s*(\\d{4}년\\s*\\d{1,2}월\\s*\\d{1,2}일)`, 'i'),
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const parsed = parseKoreanDate(match[1]);
          if (parsed && parsed <= new Date()) {
            return parsed;
          }
        }
      }
    }

    return null;
  }

  /**
   * P3 Enhancement: Validate budget against title context
   *
   * Logs warnings when extracted budget seems inconsistent with announcement type.
   * General track programs typically have budgets in 3-10억원 range.
   * If budget exceeds 20억원 for general track, it may indicate extraction error.
   */
  private validateBudgetAgainstTitle(budget: number): void {
    const title = this.detailPageData.title.toLowerCase();

    // Check for General Track announcements (일반트랙, 일반 트랙, general track)
    const isGeneralTrack =
      title.includes('일반트랙') || title.includes('일반 트랙') || title.includes('general track');

    if (isGeneralTrack && budget > 2000000000) {
      // > 20억원
      this.logger.logWarning(
        'BUDGET',
        `Extracted budget (${budget.toLocaleString()} won) unusually high for General Track`,
        `Title: ${this.detailPageData.title}, Budget: ${budget.toLocaleString()} won (${
          budget / 100000000
        }억원)`
      );
    }
  }
}
