#!/usr/bin/env tsx
/**
 * Count programs with NULL attachment text across all date ranges
 *
 * Purpose: Identify how many programs need reprocessing due to failed text extraction
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('COUNTING PROGRAMS WITH NULL ATTACHMENT TEXT');
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('');

  // Count by date range
  const byDateRange: any[] = await prisma.$queryRaw`
    SELECT
      sj."dateRange",
      COUNT(*) as total_jobs,
      COUNT(CASE
        WHEN sj."detailPageData"::jsonb -> 'attachments' IS NOT NULL
        THEN 1
      END) as has_attachments,
      COUNT(CASE
        WHEN sj."detailPageData"::jsonb -> 'attachments' IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(sj."detailPageData"::jsonb -> 'attachments') AS att
            WHERE att->>'text' IS NOT NULL
              AND att->>'text' != ''
              AND att->>'text' != 'null'
              AND LENGTH(att->>'text') > 50
          )
        THEN 1
      END) as null_text
    FROM scraping_jobs sj
    WHERE sj."processingStatus" = 'COMPLETED'
      AND sj."scrapingStatus" = 'SCRAPED'
    GROUP BY sj."dateRange"
    ORDER BY sj."dateRange" DESC
  `;

  console.log('By Date Range:');
  console.log('─────────────────────────────────────────────────────────────────────────');
  console.log('');

  let totalNull = 0;
  let totalWithAttachments = 0;

  byDateRange.forEach((row) => {
    console.log(`📅 ${row.dateRange}`);
    console.log(`   Total jobs: ${row.total_jobs}`);
    console.log(`   With attachments: ${row.has_attachments}`);
    console.log(`   NULL attachment text: ${row.null_text}`);
    console.log(`   Success rate: ${(((Number(row.has_attachments) - Number(row.null_text)) / Number(row.has_attachments)) * 100).toFixed(1)}%`);
    console.log('');

    totalNull += Number(row.null_text);
    totalWithAttachments += Number(row.has_attachments);
  });

  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total programs with attachments: ${totalWithAttachments}`);
  console.log(`Programs with NULL text: ${totalNull}`);
  console.log(`Programs with extracted text: ${totalWithAttachments - totalNull}`);
  console.log(`Overall success rate: ${(((totalWithAttachments - totalNull) / totalWithAttachments) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`🔄 Programs needing reprocessing: ${totalNull}`);
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
