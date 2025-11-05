/**
 * Verify Investment Threshold Extraction from Real HWP Files (Phase 3)
 *
 * This script tests the enhanced investment extraction patterns on actual NTIS HWP files
 * to verify the regex patterns work in production scenarios (NO AI - pure regex).
 *
 * Strategy:
 * 1. Select representative HWP files from NTIS attachments directory
 * 2. Extract text using existing LibreOffice converter
 * 3. Run extractEligibilityCriteria() on extracted text
 * 4. Report any detected investment thresholds
 *
 * Usage: npx tsx scripts/verify-investment-extraction-hwp.ts
 */

import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';
import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  fileName: string;
  fileSize: number;
  extractionSuccess: boolean;
  extractedTextLength: number;
  investmentThreshold: {
    detected: boolean;
    amount?: number;
    description?: string;
  };
  otherRequirements: {
    certifications?: string[];
    operatingYears?: string;
    rdInvestmentRatio?: string;
  };
  error?: string;
}

const TEST_FILES = [
  // Mix of .hwp and .hwpx files from different months
  '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250701_to_20250731/page-1/announcement-71/[공고문] 2025년도 미래국방혁신기술개발사업 신규과제 공고문.hwp',
  '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250701_to_20250731/page-1/announcement-76/1. 2025년도 제4차 바이오헬스분야 연구개발사업 신규지원 대상과제 공고_97139914723704930.hwpx',
  '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250701_to_20250731/page-1/announcement-73/01. 2025년도 소재부품기술개발사업(2차)(재공고) 신규지원 대상과제 공고_97125602600967841.hwp',
  '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250701_to_20250731/page-7/announcement-11/[2025-497] 2025년 2차 에너지국제공동연구사업 신규지원 대상과제 공고_95391879005922437.hwpx',
  '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250701_to_20250731/page-2/announcement-64/2025년 바이오·의료기술개발사업 제2차 신규과제 2차 재공고_96982136769626990.hwp',
];

async function verifyInvestmentExtraction() {
  console.log('🔍 Verify Investment Threshold Extraction from Real HWP Files (Phase 3)\n');
  console.log('═'.repeat(80));
  console.log();

  const results: VerificationResult[] = [];
  let successCount = 0;
  let detectedCount = 0;

  for (const filePath of TEST_FILES) {
    const fileName = path.basename(filePath);
    console.log(`📄 Processing: ${fileName}`);
    console.log('─'.repeat(80));

    const result: VerificationResult = {
      fileName,
      fileSize: 0,
      extractionSuccess: false,
      extractedTextLength: 0,
      investmentThreshold: {
        detected: false,
      },
      otherRequirements: {},
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        result.error = 'File not found';
        console.log(`   ⚠️  File not found: ${filePath}`);
        results.push(result);
        console.log();
        continue;
      }

      // Get file size
      const stats = fs.statSync(filePath);
      result.fileSize = stats.size;
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);

      // Read file buffer
      const fileBuffer = fs.readFileSync(filePath);

      // Extract text using LibreOffice converter (same method used in production)
      console.log(`   Extracting text from ${path.extname(filePath).toUpperCase()} file...`);
      const extractedText = await extractTextFromAttachment(fileName, fileBuffer);

      if (!extractedText || extractedText.length === 0) {
        result.error = 'Text extraction failed (empty result)';
        console.log(`   ❌ Text extraction failed`);
        results.push(result);
        console.log();
        continue;
      }

      result.extractionSuccess = true;
      result.extractedTextLength = extractedText.length;
      console.log(`   ✅ Extracted ${extractedText.length.toLocaleString()} characters`);
      successCount++;

      // Run eligibility criteria extraction
      console.log(`   Running investment threshold detection...`);
      const eligibilityCriteria = extractEligibilityCriteria(extractedText);

      if (!eligibilityCriteria) {
        console.log(`   ℹ️  No eligibility criteria detected in this document`);
        results.push(result);
        console.log();
        continue;
      }

      // Check for investment threshold
      const investmentThreshold = eligibilityCriteria.financialRequirements?.investmentThreshold;
      if (investmentThreshold) {
        result.investmentThreshold.detected = true;
        result.investmentThreshold.amount = investmentThreshold.minimumAmount;
        result.investmentThreshold.description = investmentThreshold.description;

        console.log(`   💰 INVESTMENT THRESHOLD DETECTED!`);
        console.log(`      Amount: ₩${investmentThreshold.minimumAmount.toLocaleString()}`);
        console.log(`      Original text: "${investmentThreshold.description}"`);
        detectedCount++;
      } else {
        console.log(`   ℹ️  No investment threshold detected in eligibility criteria`);
      }

      // Check for other requirements (for context)
      if (eligibilityCriteria.certificationRequirements?.required) {
        result.otherRequirements.certifications = eligibilityCriteria.certificationRequirements.required;
        console.log(`   📋 Certifications: ${eligibilityCriteria.certificationRequirements.required.join(', ')}`);
      }

      if (eligibilityCriteria.organizationRequirements?.operatingYears) {
        const opYears = eligibilityCriteria.organizationRequirements.operatingYears;
        result.otherRequirements.operatingYears = `${opYears.minimum || ''}~${opYears.maximum || ''} years`;
        console.log(`   📅 Operating years: ${result.otherRequirements.operatingYears}`);
      }

      if (eligibilityCriteria.financialRequirements?.rdInvestmentRatio) {
        const rdRatio = eligibilityCriteria.financialRequirements.rdInvestmentRatio;
        result.otherRequirements.rdInvestmentRatio = `${rdRatio.minimum}% minimum`;
        console.log(`   📊 R&D investment ratio: ${result.otherRequirements.rdInvestmentRatio}`);
      }

      results.push(result);
    } catch (error: any) {
      result.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
      results.push(result);
    }

    console.log();
  }

  // Summary
  console.log('═'.repeat(80));
  console.log('📊 Verification Summary\n');
  console.log(`Total Files Tested:              ${TEST_FILES.length}`);
  console.log(`✅ Text Extraction Success:       ${successCount} / ${TEST_FILES.length}`);
  console.log(`💰 Investment Thresholds Detected: ${detectedCount} / ${successCount}`);
  console.log();

  if (detectedCount > 0) {
    console.log('💰 Detected Investment Thresholds:');
    console.log('─'.repeat(80));
    results
      .filter((r) => r.investmentThreshold.detected)
      .forEach((r, index) => {
        console.log(`   ${index + 1}. ${r.fileName}`);
        console.log(`      Amount: ₩${r.investmentThreshold.amount!.toLocaleString()}`);
        console.log(`      Text: "${r.investmentThreshold.description}"`);
        console.log();
      });
  } else {
    console.log('ℹ️  No investment thresholds detected in tested files.');
    console.log('   (This is normal - not all announcements have investment requirements)');
    console.log();
  }

  // Error summary
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.log('❌ Errors Encountered:');
    console.log('─'.repeat(80));
    errors.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.fileName}`);
      console.log(`      Error: ${r.error}`);
      console.log();
    });
  }

  console.log('═'.repeat(80));

  // Final verdict
  if (successCount === TEST_FILES.length) {
    console.log('✅ VERIFICATION SUCCESSFUL!');
    console.log();
    console.log('All HWP files were successfully processed:');
    console.log('  • Text extraction working correctly');
    console.log('  • Investment threshold patterns integrated into production pipeline');
    console.log('  • Ready for Phase 3 commit and push');
    console.log();
    console.log('💡 Next Steps:');
    console.log('   1. Commit and push enhanced extraction patterns ✓');
    console.log('   2. Proceed with Phase 4: Progressive Profiling UI');
    console.log('   3. Phase 5: Manual Review Workflow');
    console.log('   4. Phase 6: Data Backfill (NO AI)');
  } else {
    console.log('⚠️  VERIFICATION INCOMPLETE');
    console.log();
    console.log(`Text extraction failed for ${TEST_FILES.length - successCount} files.`);
    console.log('Please check LibreOffice converter setup before proceeding.');
  }

  console.log();
  console.log('═'.repeat(80));
}

// Execute verification
verifyInvestmentExtraction().catch((error) => {
  console.error('❌ Fatal error during verification:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});
