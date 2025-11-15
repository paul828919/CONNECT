#!/usr/bin/env node

/**
 * Diagnose Announcement Folder Mismatch
 *
 * This script investigates why the announcement folders from retry results
 * don't match the scraping_jobs entries in the database.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface RetryResult {
  announcementFolder: string;
  attachmentFile: string;
  extractionMethod: string;
  eligibilityMatches: any;
}

interface RetryResultsFile {
  results: RetryResult[];
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ANNOUNCEMENT FOLDER MISMATCH DIAGNOSIS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Read retry results
  const retryResultsPath = path.join(process.cwd(), 'data', 'eligibility-extraction-retry-results.json');
  const retryResults: RetryResultsFile = JSON.parse(fs.readFileSync(retryResultsPath, 'utf-8'));

  // Get results with matches
  const resultsWithMatches = retryResults.results.filter(result =>
    result.extractionMethod !== 'failed' &&
    (result.eligibilityMatches.type1_CorporateResearchInstitute?.matched ||
     result.eligibilityMatches.type2_CorporateDedicatedRnD?.matched ||
     result.eligibilityMatches.type7_InnoBizOrVenture?.matched)
  );

  console.log(`📋 Found ${resultsWithMatches.length} results with eligibility matches:\n`);

  for (const result of resultsWithMatches) {
    console.log(`📂 Announcement Folder: ${result.announcementFolder}`);
    console.log(`   Attachment File: ${result.attachmentFile}`);

    // Try to extract components
    const match = result.announcementFolder.match(/(\d{8}_to_\d{8})\/page-(\d+)\/announcement-(\d+)/);

    if (match) {
      const dateRange = match[1];
      const pageNumber = parseInt(match[2], 10);
      const announcementIndex = parseInt(match[3], 10);

      console.log(`   Parsed: dateRange=${dateRange}, pageNumber=${pageNumber}, announcementIndex=${announcementIndex}`);

      // Query scraping_jobs
      const scrapingJob = await prisma.scraping_jobs.findFirst({
        where: {
          dateRange,
          pageNumber,
          announcementIndex,
        },
        select: {
          id: true,
          announcementTitle: true,
          attachmentFolder: true,
          fundingProgramId: true,
        },
      });

      if (scrapingJob) {
        console.log(`   ✅ MATCH FOUND: ${scrapingJob.announcementTitle}`);
        console.log(`      Database attachmentFolder: ${scrapingJob.attachmentFolder}`);
        console.log(`      Funding Program ID: ${scrapingJob.fundingProgramId || 'NULL'}`);
      } else {
        console.log(`   ❌ NO MATCH FOUND`);

        // Try to find similar entries
        const similarJobs = await prisma.scraping_jobs.findMany({
          where: {
            dateRange,
          },
          select: {
            pageNumber: true,
            announcementIndex: true,
            announcementTitle: true,
            attachmentFolder: true,
          },
          take: 5,
        });

        if (similarJobs.length > 0) {
          console.log(`   📋 Similar entries in date range ${dateRange}:`);
          similarJobs.forEach((job) => {
            console.log(`      - page-${job.pageNumber}/announcement-${job.announcementIndex}`);
            console.log(`        ${job.attachmentFolder}`);
          });
        } else {
          console.log(`   ⚠️  No entries found for date range ${dateRange}`);
        }
      }
    } else {
      console.log(`   ❌ Could not parse announcement folder path`);
    }

    console.log('');
  }

  // Show sample scraping_jobs entries for comparison
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SAMPLE SCRAPING_JOBS ENTRIES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const samples = await prisma.scraping_jobs.findMany({
    select: {
      dateRange: true,
      pageNumber: true,
      announcementIndex: true,
      attachmentFolder: true,
      announcementTitle: true,
      fundingProgramId: true,
    },
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
  });

  samples.forEach((sample) => {
    console.log(`📂 ${sample.dateRange}/page-${sample.pageNumber}/announcement-${sample.announcementIndex}`);
    console.log(`   Title: ${sample.announcementTitle}`);
    console.log(`   Folder: ${sample.attachmentFolder}`);
    console.log(`   Program ID: ${sample.fundingProgramId || 'NULL'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
