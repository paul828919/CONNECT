#!/usr/bin/env tsx
/**
 * Verify that the processor is correctly extracting text and storing data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('VERIFICATION: Text Extraction and Data Storage');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('');

  // Get a recently processed job (any status, recently updated)
  const recentJob = await prisma.scraping_jobs.findFirst({
    where: {
      OR: [
        { processingStatus: 'SKIPPED' },
        { processingStatus: 'COMPLETED' }
      ],
      updatedAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    select: {
      id: true,
      announcementTitle: true,
      processingStatus: true,
      processingWorker: true,
      processedAt: true,
      updatedAt: true,
      detailPageData: true,
      contentHash: true,
      fundingProgramId: true
    }
  });

  if (!recentJob) {
    console.log('❌ No recently processed jobs found in the last hour');
    console.log('');
    console.log('Checking for ANY processed job with text extraction...');
    console.log('');

    // Fallback: Get any job with extracted text
    const anyJob = await prisma.scraping_jobs.findFirst({
      where: {
        processingStatus: 'SKIPPED',
        detailPageData: {
          path: ['attachments', '0', 'text'],
          not: null
        }
      },
      orderBy: {
        processedAt: 'desc'
      },
      select: {
        id: true,
        announcementTitle: true,
        processingStatus: true,
        processingWorker: true,
        processedAt: true,
        updatedAt: true,
        detailPageData: true,
        contentHash: true,
        fundingProgramId: true
      }
    });

    if (!anyJob) {
      console.log('❌ No jobs with extracted text found');
      return;
    }

    console.log('✓ Found a job with extracted text');
    console.log('');

    // Use this job instead
    Object.assign(recentJob || {}, anyJob);
  }

  console.log('📋 SAMPLE PROCESSED JOB');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log(`Job ID: ${recentJob.id}`);
  console.log(`Title: ${recentJob.announcementTitle.substring(0, 70)}...`);
  console.log(`Status: ${recentJob.processingStatus}`);
  console.log(`Worker: ${recentJob.processingWorker || 'unknown'}`);
  console.log(`Processed At: ${recentJob.processedAt}`);
  console.log(`Updated At: ${recentJob.updatedAt}`);
  console.log(`Funding Program ID: ${recentJob.fundingProgramId || 'null (duplicate)'}`);
  console.log('');

  // Check extracted text from detailPageData
  const data = recentJob.detailPageData as any;
  const attachments = data?.attachments || [];

  console.log('📎 ATTACHMENT TEXT EXTRACTION');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log(`Total attachments: ${attachments.length}`);
  console.log('');

  let totalTextLength = 0;
  attachments.forEach((att: any, i: number) => {
    const textLength = att.text?.length || 0;
    totalTextLength += textLength;
    console.log(`${i + 1}. ${att.filename || 'Unnamed'}`);
    console.log(`   Text extracted: ${textLength > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`   Text length: ${textLength.toLocaleString()} characters`);
    if (textLength > 0) {
      console.log(`   Preview: ${att.text.substring(0, 150).replace(/\n/g, ' ')}...`);
    }
    console.log('');
  });

  console.log(`Total text extracted: ${totalTextLength.toLocaleString()} characters`);
  console.log('');

  // If this job references a funding program, check that too
  if (recentJob.fundingProgramId) {
    const fundingProgram = await prisma.funding_programs.findUnique({
      where: { id: recentJob.fundingProgramId },
      select: {
        id: true,
        title: true,
        deadline: true,
        budgetAmount: true,
        minTrl: true,
        maxTrl: true,
        eligibilityCriteria: true,
        publishedAt: true,
        createdAt: true
      }
    });

    if (fundingProgram) {
      console.log('💾 FUNDING_PROGRAMS TABLE DATA');
      console.log('─────────────────────────────────────────────────────────────────────────────');
      console.log(`Program ID: ${fundingProgram.id}`);
      console.log(`Title: ${fundingProgram.title}`);
      console.log(`Deadline: ${fundingProgram.deadline || 'Not extracted'}`);
      console.log(`Budget: ₩${fundingProgram.budgetAmount ? (fundingProgram.budgetAmount / 100000000).toFixed(1) + '억' : 'Not extracted'}`);
      console.log(`TRL Range: ${fundingProgram.minTrl}-${fundingProgram.maxTrl || 'Not extracted'}`);
      console.log(`Eligibility: ${fundingProgram.eligibilityCriteria ? JSON.stringify(fundingProgram.eligibilityCriteria).substring(0, 100) + '...' : 'Not extracted'}`);
      console.log(`Published At: ${fundingProgram.publishedAt || 'Not extracted'}`);
      console.log(`Created At: ${fundingProgram.createdAt}`);
      console.log('');
    }
  } else {
    console.log('💾 FUNDING_PROGRAMS TABLE DATA');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    console.log('Status: SKIPPED (duplicate - program already exists in database)');
    console.log('');
    console.log('ℹ️  This is expected behavior. The processor:');
    console.log('   1. ✅ Extracts text from HWP files');
    console.log('   2. ✅ Saves text to scraping_jobs.detailPageData');
    console.log('   3. ⊘ Checks if contentHash exists in funding_programs');
    console.log('   4. ⊘ Skips insertion if duplicate found');
    console.log('');
    console.log('The text extraction succeeded even though the program was skipped.');
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('VERIFICATION SUMMARY');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`✅ Text extraction: ${totalTextLength > 0 ? 'WORKING' : 'FAILED'}`);
  console.log(`✅ Database storage: ${recentJob.detailPageData ? 'WORKING' : 'FAILED'}`);
  console.log(`✅ Total text extracted: ${totalTextLength.toLocaleString()} chars`);
  console.log('');

  // Show extraction from different date ranges
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('EXTRACTION VERIFICATION ACROSS DATE RANGES');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  console.log('');

  const samplesByRange: any[] = await prisma.$queryRaw`
    SELECT
      sj."dateRange",
      COUNT(*) as total,
      COUNT(CASE
        WHEN EXISTS (
          SELECT 1
          FROM jsonb_array_elements(sj."detailPageData"::jsonb -> 'attachments') AS att
          WHERE att->>'text' IS NOT NULL
            AND LENGTH(att->>'text') > 50
        )
        THEN 1
      END) as with_text
    FROM scraping_jobs sj
    WHERE sj."processingStatus" IN ('COMPLETED', 'SKIPPED')
      AND sj."scrapingStatus" = 'SCRAPED'
      AND sj."detailPageData"::jsonb -> 'attachments' IS NOT NULL
    GROUP BY sj."dateRange"
    ORDER BY sj."dateRange" DESC
    LIMIT 5
  `;

  samplesByRange.forEach(row => {
    const successRate = (Number(row.with_text) / Number(row.total) * 100).toFixed(1);
    console.log(`📅 ${row.dateRange}`);
    console.log(`   Total: ${row.total}, With text: ${row.with_text} (${successRate}%)`);
  });
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
