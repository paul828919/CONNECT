/**
 * Test hwp5txt (pyhwp) on SME Announcement Files
 *
 * Verifies that hwp5txt can correctly extract Korean text from actual
 * SME program HWP attachments, checking for eligibility keyword presence.
 *
 * Data pattern discovery:
 * - attachmentUrls (bizinfo.go.kr): WORKS — returns actual files with Content-Disposition
 * - announcementFileUrl (smes.go.kr): UNRELIABLE — often returns Content-Length: 0
 *
 * Run: npx tsx scripts/test-hwp5txt-sme.ts
 */

import { PrismaClient } from '@prisma/client';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { downloadSMEAttachments } from '../lib/sme24-api/attachment-downloader';

const prisma = new PrismaClient();

const ELIGIBILITY_KEYWORDS = [
  '지원대상',
  '신청자격',
  '매출액',
  '중소기업',
  '소상공인',
  '사업자',
  '업력',
  '상시근로자',
  '직원',
  '창업',
  '벤처',
];

async function main() {
  console.log('=== hwp5txt SME Attachment Test ===\n');

  // Find programs with attachmentUrls (bizinfo.go.kr — reliable download source)
  // Many attachment URLs return empty — expand pool and filter by actual downloadability
  const programs = await prisma.sme_programs.findMany({
    where: {
      status: 'ACTIVE',
      NOT: { attachmentUrls: { isEmpty: true } },
    },
    select: {
      id: true,
      title: true,
      attachmentUrls: true,
      attachmentNames: true,
      announcementFileUrl: true,
      announcementFileName: true,
    },
    take: 30, // Large pool since many URLs return empty
    orderBy: { syncedAt: 'desc' },
  });

  console.log(`Found ${programs.length} programs with attachments\n`);

  // Test up to 3 programs that actually download successfully
  let passCount = 0;
  let testedCount = 0;

  for (let idx = 0; idx < programs.length && testedCount < 3; idx++) {
    const program = programs[idx];
    console.log(`\n--- Test ${testedCount + 1}/3: ${program.title.substring(0, 60)} ---`);
    console.log(`  Attachment URLs: ${program.attachmentUrls.length}`);
    console.log(`  Announcement URL: ${program.announcementFileUrl ? 'yes' : 'no'}`);
    console.log(`  Announcement Name: ${program.announcementFileName || '(none)'}`);

    const startTime = Date.now();

    try {
      // Use the downloader (handles priority + content-type detection)
      const { results: downloads, errors: dlErrors } = await downloadSMEAttachments({
        id: program.id,
        attachmentUrls: program.attachmentUrls,
        attachmentNames: program.attachmentNames,
        announcementFileUrl: program.announcementFileUrl,
        announcementFileName: program.announcementFileName,
      });

      if (dlErrors.length > 0) {
        console.log(`  Download errors: ${dlErrors.map((e) => e.error).join(', ')}`);
      }

      if (downloads.length === 0) {
        console.log(`  DOWNLOAD FAILED: No files downloaded — skipping to next`);
        continue;
      }

      const download = downloads[0];
      if (download.fileBuffer.length === 0) {
        console.log(`  DOWNLOAD EMPTY: 0 bytes — skipping to next`);
        continue;
      }

      // This program actually downloaded — count it as tested
      testedCount++;
      console.log(`  Downloaded: ${download.fileName} (${download.fileBuffer.length} bytes, ${download.downloadDuration}ms, source: ${download.source})`);

      // Extract text
      const extractStart = Date.now();
      const text = await extractTextFromAttachment(download.fileName, download.fileBuffer);
      const extractDuration = Date.now() - extractStart;

      if (!text) {
        console.log(`  EXTRACTION FAILED: No text returned\n`);
        continue;
      }

      console.log(`  Extracted: ${text.length} characters (${extractDuration}ms)`);

      // Check Korean text fidelity
      const hasKorean = /[가-힣]/.test(text);
      console.log(`  Korean text present: ${hasKorean ? 'YES' : 'NO'}`);

      // Check for eligibility keywords
      const foundKeywords = ELIGIBILITY_KEYWORDS.filter((kw) => text.includes(kw));
      console.log(`  Eligibility keywords found: ${foundKeywords.length}/${ELIGIBILITY_KEYWORDS.length}`);
      if (foundKeywords.length > 0) {
        console.log(`  Keywords: ${foundKeywords.join(', ')}`);
      }

      // Print sample content
      console.log(`\n  --- Sample Content (first 500 chars) ---`);
      console.log(`  ${text.substring(0, 500).replace(/\n/g, '\n  ')}`);
      console.log(`  --- End Sample ---\n`);

      // Overall assessment
      const totalDuration = Date.now() - startTime;
      const isGood = hasKorean && text.length > 100;
      console.log(`  Result: ${isGood ? 'PASS' : 'FAIL'} (total ${totalDuration}ms)`);
      if (isGood) passCount++;
    } catch (error: any) {
      console.error(`  ERROR: ${error.message}\n`);
    }
  }

  console.log(`\n=== Summary: ${passCount}/${testedCount} PASSED (${programs.length - testedCount} skipped due to empty downloads) ===`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
