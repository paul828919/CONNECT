#!/usr/bin/env node

/**
 * Integrate Eligibility Criteria from Retry Results
 *
 * This script reads the retry results JSON file and integrates extracted eligibility
 * criteria into the database by:
 * 1. Matching announcement folders to funding_programs via scraping_jobs
 * 2. Updating requiredCertifications in funding_programs
 * 3. Creating eligibility_verification entries for audit trail
 * 4. Setting requiresResearchInstitute flag when applicable
 */

import { PrismaClient, ConfidenceLevel } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface EligibilityMatch {
  type: string;
  matched: boolean;
  matchedText?: string;
  pattern?: string;
}

interface EligibilityMatches {
  type1_CorporateResearchInstitute: EligibilityMatch;
  type2_CorporateDedicatedRnD: EligibilityMatch;
  type7_InnoBizOrVenture: EligibilityMatch;
}

interface RetryResult {
  announcementFolder: string;
  attachmentFile: string;
  extractionMethod: string;
  eligibilityMatches: EligibilityMatches;
}

interface RetryResultsFile {
  summary: {
    totalFilesProcessed: number;
    successfulExtractions: number;
    failedExtractions: number;
    eligibilityTypeMatches: Record<string, number>;
  };
  results: RetryResult[];
}

/**
 * Map eligibility type to certification string
 */
function mapEligibilityToCertification(eligibilityType: string, matchedText: string): string {
  const mapping: Record<string, string> = {
    type1_CorporateResearchInstitute: '기업부설연구소',
    type2_CorporateDedicatedRnD: '연구개발전담부서',
    type7_InnoBizOrVenture: matchedText, // Use actual matched text (벤처기업 or INNO-BIZ)
  };

  return mapping[eligibilityType] || matchedText;
}

/**
 * Extract normalized attachment folder path for matching
 * Handles different base paths between local and container environments
 */
function normalizeAttachmentFolder(folderPath: string): string {
  // Example inputs:
  // - /Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250101_to_20250131/page-1/announcement-421
  // - /app/data/scraper/ntis-attachments/20251101_to_20251110/page-1/announcement-9
  // - /app/data/ntis-attachments/20250101_to_20250131/page-43/announcement-1

  // Extract the relative path starting from ntis-attachments
  const match = folderPath.match(/(ntis-attachments\/.+)/);

  if (!match) {
    console.error(`❌ Could not normalize folder path: ${folderPath}`);
    return folderPath;
  }

  // Return normalized path with /app/data/scraper/ prefix (most common format)
  return `/app/data/scraper/${match[1]}`;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ELIGIBILITY CRITERIA DATABASE INTEGRATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Read retry results file
  const retryResultsPath = path.join(process.cwd(), 'data', 'eligibility-extraction-retry-results.json');

  if (!fs.existsSync(retryResultsPath)) {
    console.error(`❌ Retry results file not found: ${retryResultsPath}`);
    process.exit(1);
  }

  const retryResults: RetryResultsFile = JSON.parse(fs.readFileSync(retryResultsPath, 'utf-8'));

  console.log(`✓ Loaded retry results: ${retryResults.summary.successfulExtractions} successful extractions`);
  console.log(`✓ Found ${retryResults.summary.eligibilityTypeMatches.type1_CorporateResearchInstitute || 0} Type 1 matches (기업부설연구소)`);
  console.log(`✓ Found ${retryResults.summary.eligibilityTypeMatches.type7_InnoBizOrVenture || 0} Type 7 matches (벤처기업/INNO-BIZ)\n`);

  // Filter results with eligibility matches
  const resultsWithMatches = retryResults.results.filter(result =>
    result.extractionMethod !== 'failed' &&
    (result.eligibilityMatches.type1_CorporateResearchInstitute.matched ||
     result.eligibilityMatches.type2_CorporateDedicatedRnD.matched ||
     result.eligibilityMatches.type7_InnoBizOrVenture.matched)
  );

  console.log(`📋 Processing ${resultsWithMatches.length} results with eligibility matches...\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of resultsWithMatches) {
    try {
      // Normalize announcement folder for matching
      const normalizedFolder = normalizeAttachmentFolder(result.announcementFolder);

      // Find scraping job by attachment folder (handles wildcards for /app/data vs /app/data/scraper)
      const scrapingJob = await prisma.scraping_jobs.findFirst({
        where: {
          OR: [
            { attachmentFolder: normalizedFolder },
            { attachmentFolder: normalizedFolder.replace('/app/data/scraper/', '/app/data/') },
          ],
        },
        select: {
          id: true,
          fundingProgramId: true,
          announcementTitle: true,
          attachmentFolder: true,
        },
      });

      if (!scrapingJob) {
        console.log(`⚠️  SKIP: No scraping job found for folder: ${normalizedFolder}`);
        console.log(`   Original path: ${result.announcementFolder}`);
        skipped++;
        continue;
      }

      if (!scrapingJob.fundingProgramId) {
        console.log(`⚠️  SKIP: Scraping job ${scrapingJob.id} has no linked funding program`);
        skipped++;
        continue;
      }

      // Extract matched certifications
      const certifications: string[] = [];
      let requiresResearchInstitute = false;

      if (result.eligibilityMatches.type1_CorporateResearchInstitute.matched) {
        certifications.push('기업부설연구소');
        requiresResearchInstitute = true;
      }

      if (result.eligibilityMatches.type2_CorporateDedicatedRnD.matched) {
        certifications.push('연구개발전담부서');
      }

      if (result.eligibilityMatches.type7_InnoBizOrVenture.matched) {
        const matchedText = result.eligibilityMatches.type7_InnoBizOrVenture.matchedText || '벤처기업';
        certifications.push(matchedText);
      }

      // Update funding_programs
      await prisma.funding_programs.update({
        where: { id: scrapingJob.fundingProgramId },
        data: {
          requiredCertifications: {
            set: certifications,
          },
          requiresResearchInstitute,
          eligibilityConfidence: ConfidenceLevel.HIGH,
          eligibilityLastUpdated: new Date(),
        },
      });

      // Create eligibility_verification entry for audit trail
      await prisma.eligibility_verification.create({
        data: {
          programId: scrapingJob.fundingProgramId,
          requiredCertifications: certifications,
          requiresResearchInstitute,
          confidence: ConfidenceLevel.HIGH,
          extractionMethod: 'ANNOUNCEMENT_FILE',
          sourceFiles: [result.attachmentFile],
          extractionNotes: `Extracted via Hancom-Tesseract from retry script. Matched patterns: ${certifications.join(', ')}`,
          verified: false, // Pending manual verification
        },
      });

      console.log(`✅ UPDATED: ${scrapingJob.announcementTitle}`);
      console.log(`   Program ID: ${scrapingJob.fundingProgramId}`);
      console.log(`   Certifications: ${certifications.join(', ')}`);
      console.log(`   Requires Research Institute: ${requiresResearchInstitute}`);
      console.log('');

      updated++;
    } catch (error) {
      console.error(`❌ ERROR processing ${result.announcementFolder}:`);
      console.error(error);
      console.log('');
      errors++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 INTEGRATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Updated: ${updated} programs`);
  console.log(`⚠️  Skipped: ${skipped} programs`);
  console.log(`❌ Errors: ${errors} programs`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (updated > 0) {
    console.log('✓ Eligibility criteria successfully integrated into database');
    console.log('✓ Eligibility verification entries created for audit trail');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
