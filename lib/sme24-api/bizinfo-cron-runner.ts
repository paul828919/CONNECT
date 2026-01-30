/**
 * bizinfo.go.kr Detail Page Scraping — Cron Runner
 *
 * Lightweight wrapper for cron job integration. Queries programs that
 * haven't been scraped yet and runs the bizinfo detail page scraper.
 *
 * Resource-aware: defaults to 100 programs/run with 1s between requests.
 */

import { db } from '@/lib/db';
import { scrapeBizinfoDetailPage, sleep } from './bizinfo-detail-scraper';

interface BizinfoCronResult {
  total: number;
  scraped: number;
  dbUpdated: number;
  errors: number;
  duration: number;
}

/**
 * Run bizinfo.go.kr detail page scraping for unscraped programs.
 * Designed to be called from the cron scheduler after Tier 1 enrichment.
 */
export async function runBizinfoDetailScraping(
  options: { limit?: number } = {}
): Promise<BizinfoCronResult> {
  const startTime = Date.now();
  const { limit = 100 } = options;

  const result: BizinfoCronResult = {
    total: 0,
    scraped: 0,
    dbUpdated: 0,
    errors: 0,
    duration: 0,
  };

  try {
    // Query programs with bizinfo.go.kr detailUrl that haven't been scraped
    const programs = await db.sme_programs.findMany({
      where: {
        status: 'ACTIVE',
        detailUrl: { contains: 'bizinfo.go.kr' },
        detailPageScrapedAt: null,
      },
      select: {
        id: true,
        title: true,
        detailUrl: true,
      },
      take: limit,
      orderBy: { syncedAt: 'desc' },
    });

    result.total = programs.length;

    if (programs.length === 0) {
      console.log('[BizinfoCron] No unscraped programs found');
      result.duration = Date.now() - startTime;
      return result;
    }

    console.log(`[BizinfoCron] Processing ${programs.length} programs`);

    for (const program of programs) {
      if (!program.detailUrl) continue;

      try {
        const scrapeResult = await scrapeBizinfoDetailPage(
          program.detailUrl,
          program.id
        );

        if (scrapeResult === null) {
          result.errors++;
          continue;
        }

        result.scraped++;

        // Save to database
        await db.sme_programs.update({
          where: { id: program.id },
          data: {
            detailPageText: scrapeResult.pageText || null,
            detailPageScrapedAt: scrapeResult.scrapedAt,
            detailPageTags: scrapeResult.tags,
          },
        });
        result.dbUpdated++;

        // Rate limiting: 1 second between requests
        await sleep(1000);
      } catch (error: any) {
        result.errors++;
        console.error(`[BizinfoCron] Error for ${program.id}: ${error.message}`);
      }
    }
  } catch (error: any) {
    console.error('[BizinfoCron] Fatal error:', error.message);
  }

  result.duration = Date.now() - startTime;
  return result;
}
