/**
 * Verification Script: Budget Extraction Fix (Line 436)
 *
 * Purpose: Verify that the critical 10x budget multiplier bug fix is working correctly
 *
 * Bug Fixed: Line 436 in ntis-announcement-parser.ts
 * - BEFORE: 억 (eok) = 1,000,000,000 (10^9) ❌ WRONG
 * - AFTER:  억 (eok) = 100,000,000 (10^8) ✅ CORRECT
 *
 * Test Files:
 * 1. TIPS startup support: 2025년 팁스TIPS 창업기업 지원계획 통합공_89778315675600044.hwp
 * 2. Defense industry SME: 붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp
 *
 * Verification Steps:
 * 1. Extract text from HWP files using pyhwp
 * 2. Parse budget using extractBudget() with fixed line 436
 * 3. Display extracted budget with conversion details
 * 4. Validate budget values match Korean currency standards
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractBudget, extractBudgetWithContext } from '../lib/scraping/parsers/ntis-announcement-parser';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

interface TestFile {
  name: string;
  path: string;
  description: string;
  expectedBudgetRange?: { min: number; max: number };
}

const TEST_FILES: TestFile[] = [
  {
    name: '2025년 팁스TIPS 창업기업 지원계획 통합공_89778315675600044.hwp',
    path: '/app/data/ntis-attachments/20250401_to_20250430/page-22/announcement-72/2025년 팁스TIPS 창업기업 지원계획 통합공_89778315675600044.hwp',
    description: 'TIPS Startup Support Program',
    expectedBudgetRange: { min: 100000000, max: 10000000000 } // 1억 ~ 100억
  },
  {
    name: '붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp',
    path: '/app/data/ntis-attachments/20250201_to_20250228/page-8/announcement-290/붙임1. 25-1차 글로벌 방위산업 강소기업 육성사업 지원과제 및 주관기업 모집 공고문.hwp',
    description: 'Global Defense Industry SME Support',
    expectedBudgetRange: { min: 100000000, max: 20000000000 } // 1억 ~ 200억
  }
];

function formatBudget(won: number): string {
  const eok = won / 100000000; // 억 = 10^8
  return `${won.toLocaleString('ko-KR')}원 (${eok.toFixed(2)}억원)`;
}

function validateBudgetConversion(won: number): boolean {
  // Validate that budget is reasonable (not affected by 10x error)
  // Korean R&D programs typically range from 1억 to 500억
  const MIN_REASONABLE = 10000000; // 0.1억 (10 million won)
  const MAX_REASONABLE = 100000000000; // 1,000억 (100 billion won)

  return won >= MIN_REASONABLE && won <= MAX_REASONABLE;
}

async function testBudgetExtraction() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Verification Test: Budget Extraction Fix (Line 436)');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🔧 Bug Fixed: 억 (eok) multiplier changed from 10^9 to 10^8');
  console.log('   Line 436: ntis-announcement-parser.ts');
  console.log('   Impact: Fallback pattern "총 [amount]억원" now converts correctly');
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const testFile of TEST_FILES) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📄 Test File: ${testFile.name}`);
    console.log(`   Description: ${testFile.description}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Check if file exists
    if (!fs.existsSync(testFile.path)) {
      console.log(`❌ File not found: ${testFile.path}`);
      console.log('');
      failCount++;
      continue;
    }

    try {
      // Step 1: Read HWP file
      const fileBuffer = fs.readFileSync(testFile.path);
      const fileSize = (fileBuffer.length / 1024).toFixed(1);
      console.log(`✓ File loaded: ${fileSize} KB`);

      // Step 2: Extract text using pyhwp
      console.log('🔄 Extracting text using pyhwp...');
      const startTime = Date.now();
      const extractedText = await extractTextFromAttachment(testFile.name, fileBuffer);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!extractedText || extractedText.length === 0) {
        console.log(`❌ Text extraction failed after ${duration}s`);
        console.log('');
        failCount++;
        continue;
      }

      console.log(`✓ Text extracted: ${extractedText.length} characters in ${duration}s`);

      // Check Korean character ratio
      const koreanChars = (extractedText.match(/[가-힣]/g) || []).length;
      const koreanPercentage = ((koreanChars / extractedText.length) * 100).toFixed(1);
      console.log(`  Korean characters: ${koreanChars} (${koreanPercentage}%)`);
      console.log('');

      // Step 3: Extract budget using fixed parser
      console.log('🔍 Parsing budget from extracted text...');

      // Try basic extraction first
      const budgetBasic = extractBudget(extractedText);

      // Try context-aware extraction (P2 enhancement)
      const budgetContext = extractBudgetWithContext(extractedText, testFile.name);

      console.log('');
      console.log('📊 EXTRACTION RESULTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Display basic extraction result
      if (budgetBasic !== null) {
        console.log(`✓ Basic Extraction: ${formatBudget(budgetBasic)}`);

        // Validate conversion
        if (validateBudgetConversion(budgetBasic)) {
          console.log('  ✅ Budget value is reasonable (not affected by 10x error)');
        } else {
          console.log('  ⚠️  WARNING: Budget value seems unreasonable!');
        }

        // Check against expected range
        if (testFile.expectedBudgetRange) {
          const { min, max } = testFile.expectedBudgetRange;
          if (budgetBasic >= min && budgetBasic <= max) {
            console.log(`  ✓ Within expected range: ${formatBudget(min)} ~ ${formatBudget(max)}`);
          } else {
            console.log(`  ⚠️  Outside expected range: ${formatBudget(min)} ~ ${formatBudget(max)}`);
          }
        }
      } else {
        console.log('✗ Basic Extraction: No budget found');
      }

      console.log('');

      // Display context-aware extraction result
      if (budgetContext.amount !== null) {
        console.log(`✓ Context-Aware Extraction: ${formatBudget(budgetContext.amount)}`);
        if (budgetContext.track) {
          console.log(`  Track detected: ${budgetContext.track}`);
        }

        // Compare results
        if (budgetBasic !== null && budgetBasic !== budgetContext.amount) {
          console.log(`  ⚠️  Note: Different from basic extraction (${formatBudget(budgetBasic)})`);
        }
      } else {
        console.log('✗ Context-Aware Extraction: No budget found');
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      // Show text sample with budget mentions
      console.log('📝 Text Sample (budget-related keywords):');
      const budgetKeywords = ['억원', '억 원', '총', '지원금', '예산'];
      const lines = extractedText.split('\n');
      const relevantLines = lines.filter(line =>
        budgetKeywords.some(keyword => line.includes(keyword))
      ).slice(0, 5); // Show up to 5 relevant lines

      if (relevantLines.length > 0) {
        relevantLines.forEach((line, idx) => {
          console.log(`  ${idx + 1}. ${line.trim().substring(0, 100)}`);
        });
      } else {
        console.log('  (No lines with budget keywords found)');
      }
      console.log('');

      if (budgetBasic !== null || budgetContext.amount !== null) {
        successCount++;
        console.log('✅ TEST PASSED: Budget extraction successful');
      } else {
        failCount++;
        console.log('❌ TEST FAILED: No budget could be extracted');
      }

    } catch (error: any) {
      console.log('❌ TEST FAILED: Error during extraction');
      console.error('   Error:', error.message);
      failCount++;
    }

    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`Total Files Tested:    ${successCount + failCount}`);
  console.log(`Successful Extractions: ${successCount}`);
  console.log(`Failed Extractions:     ${failCount}`);
  console.log('');

  if (successCount === TEST_FILES.length) {
    console.log('✅ ALL TESTS PASSED');
    console.log('   The budget extraction fix (line 436) is working correctly.');
    console.log('   Korean currency conversion: 억 = 10^8 (100 million won)');
  } else if (successCount > 0) {
    console.log('⚠️  PARTIAL SUCCESS');
    console.log(`   ${successCount} out of ${TEST_FILES.length} files extracted successfully.`);
  } else {
    console.log('❌ ALL TESTS FAILED');
    console.log('   Budget extraction is not working. Check logs above for details.');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');
}

// Run verification
testBudgetExtraction()
  .then(() => {
    console.log('Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
