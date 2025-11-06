/**
 * Backfill Script: Add Category and Keywords to Existing NTIS Programs
 *
 * Purpose: Update existing NTIS programs with category and keywords
 * extracted from their announcing agency metadata.
 *
 * Strategy:
 * 1. Fetch all NTIS programs missing category/keywords (announcementType = 'R_D_PROJECT')
 * 2. For programs with announcingAgency already → extract category/keywords directly
 * 3. For programs WITHOUT announcingAgency → re-visit NTIS URL to extract agency first
 * 4. Extract category from announcing agency using agency mapper
 * 5. Extract keywords (agency defaults + title extraction)
 * 6. Update program with new category, keywords, and announcingAgency (if missing)
 *
 * Expected Impact:
 * - Before: All programs have category=null, keywords=[]
 * - After: 95%+ programs have accurate category and 5-15 keywords
 * - Match diversity improvement: From 3 identical matches → 10+ diverse matches per profile
 *
 * Usage:
 *   npx tsx scripts/backfill-ntis-categories.ts
 */

import { db } from '@/lib/db';
import {
  extractCategoryFromAgency,
  getAgencyKeywords,
} from '@/lib/scraping/parsers/agency-mapper';
import { chromium, Browser, Page } from 'playwright';
import { cleanHtmlText } from '@/lib/scraping/utils';

interface BackfillStats {
  totalPrograms: number;
  programsUpdated: number;
  programsSkipped: number;
  programsRescraped: number; // Programs that needed re-scraping for announcingAgency
  categoriesAdded: number;
  keywordsAdded: number;
  errors: number;
}

/**
 * Extract keywords from program title
 * Uses same pattern matching as ntis-announcement-parser.ts
 */
function extractKeywordsFromTitle(title: string): string[] {
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
    const matches = title.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 1) {
        keywords.push(match[1]);
      }
    }
  }

  // Deduplicate (case-insensitive for Korean)
  return Array.from(new Set(keywords.map((k) => k.trim()))).filter((k) => k.length > 0);
}

/**
 * Extract announcingAgency from NTIS detail page
 * Used for programs that don't have this field yet
 */
async function extractAnnouncingAgency(page: Page, url: string): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const bodyText = (await page.textContent('body')) || '';

    // Extract 공고기관명 using same pattern as ntis-announcement-parser.ts
    const pattern = /공고기관명\s*:\s*([^\n]+?)(?=\s+[가-힣]+\s*:|\n|$)/i;
    const match = bodyText.match(pattern);

    if (match && match[1]) {
      const agency = match[1].trim();
      if (agency.length > 0 && agency !== ':' && agency !== '-') {
        return agency;
      }
    }

    return null;
  } catch (error: any) {
    console.error(`Failed to extract announcingAgency from ${url}:`, error.message);
    return null;
  }
}

/**
 * Main backfill function
 */
async function backfillNTISCategories(): Promise<void> {
  console.log('🚀 Starting NTIS category and keyword backfill...\n');

  const stats: BackfillStats = {
    totalPrograms: 0,
    programsUpdated: 0,
    programsSkipped: 0,
    programsRescraped: 0,
    categoriesAdded: 0,
    keywordsAdded: 0,
    errors: 0,
  };

  let browser: Browser | null = null;

  try {
    // 1. Fetch all NTIS programs missing category or keywords
    console.log('📊 Fetching NTIS programs missing category/keywords...');
    const programs = await db.funding_programs.findMany({
      where: {
        agencyId: 'NTIS',
        announcementType: 'R_D_PROJECT',
        OR: [{ category: null }, { keywords: { isEmpty: true } }],
      },
      select: {
        id: true,
        title: true,
        announcementUrl: true,
        category: true,
        keywords: true,
        announcingAgency: true, // May be null for older programs
      },
    });

    stats.totalPrograms = programs.length;
    console.log(`✓ Found ${stats.totalPrograms} programs to backfill\n`);

    if (stats.totalPrograms === 0) {
      console.log('✅ No programs need backfilling!');
      return;
    }

    // Initialize browser only if we need to re-scrape programs
    const programsNeedingRescrape = programs.filter((p) => !p.announcingAgency);
    if (programsNeedingRescrape.length > 0) {
      console.log(
        `⚠️  ${programsNeedingRescrape.length} programs missing announcingAgency - will re-scrape...\n`
      );
      browser = await chromium.launch({ headless: true });
    }

    // 2. Process each program
    for (let i = 0; i < programs.length; i++) {
      const program = programs[i];
      const progress = `[${i + 1}/${programs.length}]`;

      try {
        let announcingAgency = program.announcingAgency;

        // If announcingAgency is missing, re-scrape the detail page
        if (!announcingAgency && browser) {
          console.log(
            `${progress} Re-scraping for agency: ${program.title.substring(0, 50)}...`
          );

          const page = await browser.newPage();
          announcingAgency = await extractAnnouncingAgency(page, program.announcementUrl);
          await page.close();

          if (announcingAgency) {
            stats.programsRescraped++;
          } else {
            console.log(`${progress} ⚠️  Failed to extract agency, skipping...`);
            stats.programsSkipped++;
            continue;
          }
        }

        // If still no announcingAgency, skip this program
        if (!announcingAgency) {
          console.log(
            `${progress} ⚠️  Skipped (no agency): ${program.title.substring(0, 60)}...`
          );
          stats.programsSkipped++;
          continue;
        }

        // Extract category from announcing agency
        const category = extractCategoryFromAgency(announcingAgency);

        // Extract keywords (agency defaults + title extraction)
        const agencyKeywords = getAgencyKeywords(announcingAgency);
        const titleKeywords = extractKeywordsFromTitle(program.title);
        const allKeywords = Array.from(new Set([...agencyKeywords, ...titleKeywords])).slice(
          0,
          15
        ); // Top 15 keywords

        // Determine what needs to be updated
        const needsCategoryUpdate = !program.category && category !== null;
        const needsKeywordsUpdate = program.keywords.length === 0 && allKeywords.length > 0;
        const needsAgencyUpdate = !program.announcingAgency && announcingAgency !== null;

        if (!needsCategoryUpdate && !needsKeywordsUpdate && !needsAgencyUpdate) {
          stats.programsSkipped++;
          continue;
        }

        // Update program
        await db.funding_programs.update({
          where: { id: program.id },
          data: {
            ...(needsCategoryUpdate && { category }),
            ...(needsKeywordsUpdate && { keywords: allKeywords }),
            ...(needsAgencyUpdate && { announcingAgency }),
          },
        });

        // Update stats
        stats.programsUpdated++;
        if (needsCategoryUpdate) stats.categoriesAdded++;
        if (needsKeywordsUpdate) stats.keywordsAdded++;

        // Log progress every 50 programs
        if ((i + 1) % 50 === 0 || i === programs.length - 1) {
          console.log(
            `${progress} Progress: ${stats.programsUpdated} updated, ${stats.programsSkipped} skipped, ${stats.programsRescraped} re-scraped`
          );
        }
      } catch (error: any) {
        console.error(`${progress} ❌ Error processing program ${program.id}: ${error.message}`);
        stats.errors++;
      }
    }

    // 3. Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total programs processed:     ${stats.totalPrograms}`);
    console.log(`Programs updated:             ${stats.programsUpdated}`);
    console.log(`Programs skipped:             ${stats.programsSkipped}`);
    console.log(`Programs re-scraped:          ${stats.programsRescraped}`);
    console.log(`Categories added:             ${stats.categoriesAdded}`);
    console.log(`Keywords added:               ${stats.keywordsAdded}`);
    console.log(`Errors encountered:           ${stats.errors}`);
    console.log('='.repeat(70));

    // 4. Calculate success rate
    const successRate = ((stats.programsUpdated / stats.totalPrograms) * 100).toFixed(1);
    console.log(`\n✅ Success rate: ${successRate}% (target: >95%)`);

    if (parseFloat(successRate) >= 95) {
      console.log('🎉 Backfill completed successfully! Category extraction accuracy target met.');
    } else {
      console.log(
        '⚠️  Success rate below target (95%). Review skipped programs for missing agency metadata.'
      );
    }
  } catch (error: any) {
    console.error('❌ Backfill failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    await db.$disconnect();
  }
}

// Run backfill
backfillNTISCategories()
  .then(() => {
    console.log('\n✅ Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });
