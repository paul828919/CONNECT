/**
 * Extraction Logger - Field-level extraction tracking with synonym discovery
 *
 * Purpose: Track every field extraction attempt across three data sources:
 * 1. Announcement files (공고문) - Highest priority, most reliable
 * 2. Detail page rawHtml - Fallback for missing announcement files
 * 3. Discovery detailPageData - Last resort (often fails for NTIS)
 *
 * Features:
 * - Logs extraction source and confidence for each field
 * - Captures context snippets for failed extractions (synonym discovery)
 * - Tracks attempted sources for debugging
 * - Supports batch logging for performance
 *
 * Usage:
 *   const logger = new ExtractionLogger(jobId);
 *   logger.logSuccess('DEADLINE', new Date('2025-10-31'), 'ANNOUNCEMENT_FILE', 'HIGH', '마감일 : 2025.10.31');
 *   logger.logFailure('BUDGET', ['ANNOUNCEMENT_FILE', 'RAW_HTML'], 'No synonym matched', '총 사업비 규모 : 50억원');
 *   await logger.flush(); // Save to database
 */

import { db } from '@/lib/db';
import type { ExtractionField, DataSource, ConfidenceLevel } from '@prisma/client';

export interface ExtractionLog {
  field: ExtractionField;
  value: string | null;
  dataSource: DataSource;
  confidence: ConfidenceLevel;
  extractionPattern?: string;
  attemptedSources: string[];
  failureReason?: string;
  contextSnippet?: string;
}

export class ExtractionLogger {
  private jobId: string;
  private logs: ExtractionLog[] = [];

  constructor(jobId: string) {
    this.jobId = jobId;
  }

  /**
   * Log a successful extraction
   */
  logSuccess(
    field: ExtractionField,
    value: any,
    dataSource: DataSource,
    confidence: ConfidenceLevel,
    extractionPattern?: string
  ): void {
    this.logs.push({
      field,
      value: String(value),
      dataSource,
      confidence,
      extractionPattern,
      attemptedSources: [dataSource],
    });
  }

  /**
   * Log a failed extraction with context for synonym discovery
   */
  logFailure(
    field: ExtractionField,
    attemptedSources: DataSource[],
    failureReason: string,
    contextSnippet?: string
  ): void {
    this.logs.push({
      field,
      value: null,
      dataSource: 'FAILED',
      confidence: 'LOW',
      attemptedSources: attemptedSources as string[],
      failureReason,
      contextSnippet: contextSnippet ? this.truncateContext(contextSnippet) : undefined,
    });
  }

  /**
   * Truncate context snippet to 500 characters around the most relevant text
   */
  private truncateContext(text: string): string {
    if (text.length <= 500) return text;

    // Try to find budget-related keywords and extract 500 chars around them
    const keywords = ['사업비', '지원금액', '지원규모', '총', '억', '백만'];
    for (const keyword of keywords) {
      const index = text.indexOf(keyword);
      if (index !== -1) {
        const start = Math.max(0, index - 200);
        const end = Math.min(text.length, index + 300);
        return '...' + text.substring(start, end) + '...';
      }
    }

    // Fallback: First 500 characters
    return text.substring(0, 500) + '...';
  }

  /**
   * Get all logs for console display
   */
  getLogs(): ExtractionLog[] {
    return this.logs;
  }

  /**
   * Flush logs to database (batch insert for performance)
   */
  async flush(): Promise<void> {
    if (this.logs.length === 0) return;

    try {
      await db.extraction_logs.createMany({
        data: this.logs.map((log) => ({
          scrapingJobId: this.jobId,
          field: log.field,
          value: log.value,
          dataSource: log.dataSource,
          confidence: log.confidence,
          extractionPattern: log.extractionPattern,
          attemptedSources: log.attemptedSources,
          failureReason: log.failureReason,
          contextSnippet: log.contextSnippet,
        })),
      });

      console.log(`   💾 Saved ${this.logs.length} extraction logs to database`);
    } catch (error: any) {
      console.error(`   ❌ Failed to save extraction logs: ${error.message}`);
    }
  }

  /**
   * Print extraction summary to console
   */
  printSummary(): void {
    const successful = this.logs.filter((log) => log.dataSource !== 'FAILED');
    const failed = this.logs.filter((log) => log.dataSource === 'FAILED');

    console.log(`\n   📊 Extraction Summary:`);
    console.log(`      ✅ Successful: ${successful.length}/${this.logs.length}`);

    if (successful.length > 0) {
      console.log(`      Sources:`);
      const sourceCounts = successful.reduce((acc, log) => {
        acc[log.dataSource] = (acc[log.dataSource] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`        - ${source}: ${count}`);
      });
    }

    if (failed.length > 0) {
      console.log(`      ❌ Failed: ${failed.length}`);
      failed.forEach((log) => {
        console.log(`        - ${log.field}: ${log.failureReason}`);
        if (log.contextSnippet) {
          console.log(`          Context: ${log.contextSnippet.substring(0, 100)}...`);
        }
      });
    }
  }
}
