/**
 * Diagnostic Script: DCP Investment Extraction Bug
 *
 * This script extracts text from a DCP announcement file and runs it through
 * the extractInvestmentRequirement function to debug why the section-aware
 * filter isn't working.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { extractInvestmentRequirement } from '../lib/scraping/utils';

async function diagnoseDCPExtraction() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      DCP INVESTMENT EXTRACTION DIAGNOSTIC                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  // Path to DCP-34 announcement file (HWP)
  const attachmentFolder = '/app/data/ntis-attachments/20250401_to_20250430/page-5/announcement-247';
  const hwpFileName = '2025년_딥테크_챌린지_프로젝트(DCP)_지원계획_공_100005700622372875.hwp';
  const hwpFilePath = path.join(attachmentFolder, hwpFileName);

  console.log('📄 File:', hwpFileName);
  console.log('📁 Path:', hwpFilePath);
  console.log();

  // Check if file exists
  if (!fs.existsSync(hwpFilePath)) {
    console.error('❌ File not found!');
    return;
  }

  console.log('✅ File exists');
  const fileBuffer = fs.readFileSync(hwpFilePath);
  console.log(`📊 File size: ${fileBuffer.length} bytes`);
  console.log();

  // Extract text
  console.log('🔍 Extracting text from HWP...');
  const extractedText = await extractTextFromAttachment(hwpFileName, fileBuffer);

  if (!extractedText) {
    console.error('❌ Text extraction failed!');
    return;
  }

  console.log(`✅ Extracted ${extractedText.length} characters`);
  console.log();

  // Show first 1000 characters
  console.log('📝 First 1000 characters:');
  console.log('─'.repeat(80));
  console.log(extractedText.substring(0, 1000));
  console.log('─'.repeat(80));
  console.log();

  // Check for eligibility section indicators
  console.log('🔎 Checking for eligibility section indicators:');
  const eligibilityIndicators = [
    { pattern: /지원\s*조건/, name: '지원조건 (Support conditions)' },
    { pattern: /신청\s*조건/, name: '신청조건 (Application conditions)' },
    { pattern: /신청\s*자격/, name: '신청자격 (Application qualifications)' },
    { pattern: /참여\s*요건/, name: '참여요건 (Participation requirements)' },
    { pattern: /지원\s*대상/, name: '지원대상 (Support target)' },
    { pattern: /선정\s*요건/, name: '선정요건 (Selection requirements)' },
  ];

  for (const { pattern, name } of eligibilityIndicators) {
    const match = extractedText.match(pattern);
    if (match) {
      console.log(`   ✅ Found: ${name}`);
      const matchIndex = extractedText.indexOf(match[0]);
      const context = extractedText.substring(matchIndex, matchIndex + 200);
      console.log(`      Context: ${context.substring(0, 100)}...`);
    } else {
      console.log(`   ❌ Not found: ${name}`);
    }
  }
  console.log();

  // Check for investment-related text
  console.log('💰 Checking for investment-related text:');
  const investmentPatterns = [
    { pattern: /투자\s*유치\s*([\d.]+)\s*(조|억|천만|백만|만)\s*원?\s*이상/, name: '투자유치 (Investment attraction)' },
    { pattern: /20\s*억/, name: '20억 (2 billion)' },
    { pattern: /36\s*억/, name: '36억 (3.6 billion)' },
  ];

  for (const { pattern, name } of investmentPatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      console.log(`   ✅ Found: ${name} - "${match[0]}"`);
      const matchIndex = extractedText.indexOf(match[0]);
      const context = extractedText.substring(Math.max(0, matchIndex - 100), matchIndex + 100);
      console.log(`      Context: ...${context}...`);
    } else {
      console.log(`   ❌ Not found: ${name}`);
    }
  }
  console.log();

  // Run through extraction function
  console.log('🧪 Running through extractInvestmentRequirement function...');
  const result = extractInvestmentRequirement(extractedText);
  console.log();
  console.log('📊 RESULT:', result);
  if (result) {
    console.log(`   Amount: ${result.toLocaleString('ko-KR')} won`);
    console.log(`   Formatted: ${(result / 100000000).toFixed(1)}억원`);
  } else {
    console.log('   (null - no investment requirement extracted)');
  }
  console.log();

  // Analysis
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ANALYSIS:');
  console.log();
  if (result === 2000000000) {
    console.log('   ❌ BUG REPRODUCED: Extracted 2,000,000,000 (20억원)');
    console.log('   → Section-aware filter DID NOT block the extraction');
    console.log('   → This means either:');
    console.log('      1. Eligibility section indicators not found in text');
    console.log('      2. Section-aware filter logic has a bug');
  } else if (result === null) {
    console.log('   ✅ Section-aware filter WORKED: Returned null');
    console.log('   → But database shows 2B won for this program');
    console.log('   → Investment amount must be from different source');
    console.log('      (e.g., rawHtmlText or detailPageData.description)');
  } else {
    console.log(`   ⚠️  UNEXPECTED: Extracted ${result} (${(result / 100000000).toFixed(1)}억원)`);
  }
  console.log('═══════════════════════════════════════════════════════════');
}

diagnoseDCPExtraction().catch(console.error);
