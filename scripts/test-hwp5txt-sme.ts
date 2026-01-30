/**
 * Test hwp5txt (pyhwp) on SME Announcement Files
 *
 * Verifies that hwp5txt can correctly extract Korean text from actual
 * SME program HWP attachments, checking for eligibility keyword presence.
 *
 * Run: npx tsx scripts/test-hwp5txt-sme.ts
 */

import { PrismaClient } from '@prisma/client';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

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

  // Find programs with HWP/PDF attachments
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
    },
    take: 10,
    orderBy: { syncedAt: 'desc' },
  });

  console.log(`Found ${programs.length} programs with attachments\n`);

  // Filter for HWP and PDF files
  const testCandidates: Array<{
    programId: string;
    title: string;
    url: string;
    fileName: string;
  }> = [];

  for (const program of programs) {
    for (let i = 0; i < program.attachmentUrls.length; i++) {
      const url = program.attachmentUrls[i];
      const name = program.attachmentNames[i] || `attachment_${i}`;
      const ext = name.toLowerCase();

      if (ext.endsWith('.hwp') || ext.endsWith('.hwpx') || ext.endsWith('.pdf')) {
        testCandidates.push({
          programId: program.id,
          title: program.title,
          url,
          fileName: name,
        });
      }
    }
  }

  console.log(`Found ${testCandidates.length} HWP/PDF attachments to test\n`);

  // Test up to 3 files
  const toTest = testCandidates.slice(0, 3);

  for (const candidate of toTest) {
    console.log(`--- Testing: ${candidate.fileName} ---`);
    console.log(`  Program: ${candidate.title.substring(0, 60)}`);
    console.log(`  URL: ${candidate.url.substring(0, 80)}...`);

    const startTime = Date.now();

    try {
      // Download the file
      const response = await fetch(candidate.url, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        console.log(`  DOWNLOAD FAILED: HTTP ${response.status}\n`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const downloadDuration = Date.now() - startTime;

      console.log(`  Downloaded: ${fileBuffer.length} bytes (${downloadDuration}ms)`);

      // Extract text
      const extractStart = Date.now();
      const text = await extractTextFromAttachment(candidate.fileName, fileBuffer);
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
      console.log(`  Result: ${isGood ? 'PASS' : 'FAIL'} (total ${totalDuration}ms)\n`);
    } catch (error: any) {
      console.error(`  ERROR: ${error.message}\n`);
    }
  }

  if (toTest.length === 0) {
    console.log('No HWP/PDF attachments found to test.');
    console.log('Check if sme_programs have attachmentUrls populated.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
