/**
 * Diagnostic Script: Enhancement Field Extraction Analysis
 *
 * Purpose: Inspect why TRL and Business Structures extraction is failing (0% success rate)
 *
 * What This Script Does:
 * 1. Fetches a sample of processed programs with null TRL/Business Structures
 * 2. Re-parses their rawHtml using htmlToText()
 * 3. Calls extraction functions and shows what patterns were tested
 * 4. Displays text samples that should contain TRL/Business Structure mentions
 */

import { db } from '@/lib/db';
import { extractTRLRange } from '../lib/scraping/utils';
import { extractBusinessStructures } from '../lib/scraping/parsers/ntis-announcement-parser';

function htmlToText(html: string): string {
  if (!html || html.trim().length === 0) return '';

  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
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

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  Enhancement Field Extraction Diagnosis                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Fetch processed programs with null TRL
  const programsWithNullTRL = await db.funding_programs.findMany({
    where: {
      minTrl: null,
      scraping_job: {
        isNot: null,
      },
    },
    include: {
      scraping_job: true,
    },
    take: 3,
  });

  if (programsWithNullTRL.length === 0) {
    console.log('✓ No programs with null TRL found!\n');
    return;
  }

  console.log(`Found ${programsWithNullTRL.length} programs with null TRL\n`);
  console.log('═'.repeat(80) + '\n');

  for (const program of programsWithNullTRL) {
    console.log(`\n📄 PROGRAM: ${program.title.substring(0, 60)}...`);
    console.log(`   Program ID: ${program.id}`);
    console.log(`   Scraped At: ${program.scrapedAt.toISOString()}`);
    console.log(`   TRL: ${program.minTrl}-${program.maxTrl} (null)`);
    console.log(`   Business Structures: ${program.allowedBusinessStructures.join(', ') || '(empty)'}`);
    console.log();

    if (!program.scraping_job) {
      console.log('   ⚠️  No scraping_job linked - skipping\n');
      continue;
    }

    const job = program.scraping_job;
    const detailData = job.detailPageData as any;

    if (!detailData || !detailData.rawHtml) {
      console.log('   ⚠️  No rawHtml in detailPageData - skipping\n');
      continue;
    }

    // Parse rawHtml
    const rawHtmlText = htmlToText(detailData.rawHtml);
    const description = detailData.description || '';

    console.log(`   📝 Text Sources:`);
    console.log(`      - Description: ${description.length} chars`);
    console.log(`      - Raw HTML: ${detailData.rawHtml.length} chars → ${rawHtmlText.length} chars (after parsing)`);
    console.log();

    // Combine text
    const combinedText = `${description}\n\n${rawHtmlText}`;

    console.log(`   🔍 Combined Text (Total: ${combinedText.length} chars):`);
    console.log(`   ${'─'.repeat(70)}`);
    console.log(`   First 300 chars: ${combinedText.substring(0, 300)}...`);
    console.log();
    console.log(`   Last 300 chars: ...${combinedText.substring(Math.max(0, combinedText.length - 300))}`)
    console.log(`   ${'─'.repeat(70)}`);
    console.log();

    // Test TRL extraction
    console.log(`   🧪 TRL Extraction Test:`);
    const trlResult = extractTRLRange(combinedText);
    if (trlResult) {
      console.log(`      ✓ TRL Detected: ${trlResult.minTRL}-${trlResult.maxTRL} (confidence: ${trlResult.confidence})`);
    } else {
      console.log(`      ✗ TRL Not Detected`);

      // Check for TRL-related keywords manually
      const trlKeywords = ['TRL', '기술성숙도', '기초연구', '응용연구', '실용화', '사업화', '상용화'];
      const foundKeywords = trlKeywords.filter(k => combinedText.includes(k));

      if (foundKeywords.length > 0) {
        console.log(`      ⚠️  Found TRL-related keywords but extraction failed: ${foundKeywords.join(', ')}`);

        // Show context around each keyword
        for (const keyword of foundKeywords.slice(0, 2)) {
          const index = combinedText.indexOf(keyword);
          const contextStart = Math.max(0, index - 50);
          const contextEnd = Math.min(combinedText.length, index + 50);
          const context = combinedText.substring(contextStart, contextEnd);
          console.log(`         Context for "${keyword}": ...${context}...`);
        }
      } else {
        console.log(`      ℹ️  No TRL-related keywords found in text`);
      }
    }
    console.log();

    // Test Business Structures extraction
    console.log(`   🧪 Business Structures Extraction Test:`);
    const businessStructures = extractBusinessStructures(combinedText);
    if (businessStructures && businessStructures.length > 0) {
      console.log(`      ✓ Structures Detected: ${businessStructures.join(', ')}`);
    } else {
      console.log(`      ✗ Business Structures Not Detected`);

      // Check for business structure keywords manually
      const businessKeywords = ['법인', '개인사업자', '주식회사', '유한회사'];
      const foundKeywords = businessKeywords.filter(k => combinedText.includes(k));

      if (foundKeywords.length > 0) {
        console.log(`      ⚠️  Found business structure keywords but extraction failed: ${foundKeywords.join(', ')}`);

        // Show context around first keyword
        const keyword = foundKeywords[0];
        const index = combinedText.indexOf(keyword);
        const contextStart = Math.max(0, index - 50);
        const contextEnd = Math.min(combinedText.length, index + 50);
        const context = combinedText.substring(contextStart, contextEnd);
        console.log(`         Context for "${keyword}": ...${context}...`);
      } else {
        console.log(`      ℹ️  No business structure keywords found in text`);
      }
    }
    console.log();

    console.log('═'.repeat(80));
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
