/**
 * Check why "수요조사" program was classified as R_D_PROJECT
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const programId = '4200bf2c-6bd0-447f-b305-2d5bee31ad4c';

  const job = await prisma.scraping_jobs.findFirst({
    where: { fundingProgramId: programId },
    select: {
      id: true,
      announcementTitle: true,
      detailPageData: true,
    }
  });

  if (!job) {
    console.log('Job not found!');
    return;
  }

  const detailData = job.detailPageData as any;

  console.log('='.repeat(80));
  console.log('STORED TITLE DATA:');
  console.log('='.repeat(80));
  console.log('announcementTitle:', job.announcementTitle);
  console.log('detailPageData.title:', detailData.title);
  console.log('detailPageData.description:', detailData.description || '(null)');
  console.log();

  console.log('PATTERN TEST WITH OLD CODE (empty description):');
  console.log('='.repeat(80));
  const testText = `${detailData.title || ''} ${detailData.description || ''}`.toLowerCase();
  console.log('Combined text:', testText);
  console.log('Length:', testText.length);
  console.log();
  console.log('Pattern /수요조사/ matches:', /수요조사/.test(testText));
  console.log('Pattern /기술수요/ matches:', /기술수요/.test(testText));
  console.log('Pattern /기술\\s*수요/ matches:', /기술\s*수요/.test(testText));
  console.log();

  // Now test with the classification function
  const { classifyAnnouncement } = await import('../lib/scraping/classification');

  console.log('ACTUAL CLASSIFICATION TEST:');
  console.log('='.repeat(80));

  // Test with OLD code (wrong title from detailPageData)
  const resultOld = classifyAnnouncement({
    title: detailData.title,  // Generic "국가R&D통합공고"
    description: '',
    url: 'https://example.com',
    source: 'ntis',
  });

  console.log('OLD CODE - Classification with detailData.title:', resultOld);
  console.log();

  // Test with NEW code (correct title from announcementTitle)
  const resultNew = classifyAnnouncement({
    title: job.announcementTitle,  // Specific "첨단디스플레이국가연구플랫폼구축(가칭) 기술 수요조사(연장)"
    description: 'some combined text',
    url: 'https://example.com',
    source: 'ntis',
  });

  console.log('NEW CODE - Classification with job.announcementTitle:', resultNew);

  await prisma.$disconnect();
}

main().catch(console.error);
