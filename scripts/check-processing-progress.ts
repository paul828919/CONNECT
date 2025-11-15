#!/usr/bin/env tsx
/**
 * Check current processing progress
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('PROCESSING STATUS BREAKDOWN');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  // Count by processing status
  const statusCounts: any[] = await prisma.$queryRaw`
    SELECT
      "processingStatus",
      COUNT(*) as count
    FROM scraping_jobs
    WHERE "scrapingStatus" = 'SCRAPED'
    GROUP BY "processingStatus"
    ORDER BY "processingStatus"
  `;

  let total = 0;
  statusCounts.forEach(row => {
    console.log(`${row.processingStatus.padEnd(15)}: ${row.count} jobs`);
    total += Number(row.count);
  });

  console.log('');
  console.log(`Total:           ${total} jobs`);
  console.log('');

  // Count programs with NULL text that are still PENDING
  const pendingNullText: any[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM scraping_jobs sj
    WHERE sj."processingStatus" = 'PENDING'
      AND sj."scrapingStatus" = 'SCRAPED'
      AND sj."detailPageData"::jsonb -> 'attachments' IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(sj."detailPageData"::jsonb -> 'attachments') AS att
        WHERE att->>'text' IS NOT NULL
          AND att->>'text' != ''
          AND att->>'text' != 'null'
          AND LENGTH(att->>'text') > 50
      )
  `;

  const pending = Number(statusCounts.find(r => r.processingStatus === 'PENDING')?.count || 0);
  const completed = Number(statusCounts.find(r => r.processingStatus === 'COMPLETED')?.count || 0);
  const skipped = Number(statusCounts.find(r => r.processingStatus === 'SKIPPED')?.count || 0);
  const failed = Number(statusCounts.find(r => r.processingStatus === 'FAILED')?.count || 0);

  console.log('────────────────────────────────────────────────────────────────');
  console.log('REMAINING WORK');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('');
  console.log(`Programs in PENDING status: ${pending}`);
  console.log(`Programs with NULL text awaiting processing: ${pendingNullText[0].count}`);
  console.log('');

  console.log('────────────────────────────────────────────────────────────────');
  console.log('PROGRESS SUMMARY');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('');
  console.log(`✅ Completed/Skipped: ${completed + skipped} (${((completed + skipped) / total * 100).toFixed(1)}%)`);
  console.log(`⏳ Pending: ${pending} (${(pending / total * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${(failed / total * 100).toFixed(1)}%)`);
  console.log('');

  if (pending > 0) {
    const processingRate = 1.0; // jobs per minute (conservative estimate)
    const estimatedMinutes = Math.ceil(pending / processingRate);
    const hours = Math.floor(estimatedMinutes / 60);
    const minutes = estimatedMinutes % 60;

    console.log(`Estimated time remaining: ${hours}h ${minutes}m (at ~${processingRate} jobs/min)`);
  } else {
    console.log('🎉 All jobs processed!');
  }
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
