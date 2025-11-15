/**
 * Local Test Script: DCP Announcement Extraction Debugging
 *
 * Purpose: Debug why ₩20억 investment requirement isn't extracted
 *
 * Tests:
 * 1. Extract text from DCP HWP file
 * 2. Run eligibility criteria extraction
 * 3. Show what gets captured vs. what's expected
 */

import { readFile } from 'fs/promises';
import { NTISAnnouncementParser } from '../lib/scraping/parsers/ntis-announcement-parser';

const DCP_HWP_PATH = '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250401_to_20250430/page-9/announcement-207/2025년_딥테크_챌린지_프로젝트(DCP)_지원계획_공_89209139098173462.hwp';

async function testDCPExtraction() {
  console.log('🔍 DCP Extraction Debugging\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Read HWP file
    console.log('\n📁 Step 1: Reading HWP file...');
    console.log(`   Path: ${DCP_HWP_PATH}`);

    const buffer = await readFile(DCP_HWP_PATH);
    console.log(`   ✓ File read: ${buffer.length.toLocaleString()} bytes`);

    // Step 2: Extract text from HWP
    console.log('\n📝 Step 2: Extracting text from HWP...');

    // Note: HWP extraction requires the hwp.js library
    // For now, let's test with the PDF version which is easier to parse
    const pdfPath = DCP_HWP_PATH.replace('.hwp', '.pdf');
    console.log(`   Using PDF instead: ${pdfPath}`);

    const pdfBuffer = await readFile(pdfPath);
    console.log(`   ✓ PDF read: ${pdfBuffer.length.toLocaleString()} bytes`);

    // Step 3: Parse with NTIS parser
    console.log('\n🔬 Step 3: Running NTIS parser extraction...');

    const parser = new NTISAnnouncementParser();

    // Test text extraction with the expected text from screenshot
    const testText = `
2025년 딥테크 챌린지 프로젝트(DCP) 지원계획 공고

신청자격
○ 신청 RFP의 최초 게시일 이후, 투자기관으로부터 20억원 이상 투자(확약 포함)
  받은 중소기업이 투자기관 등과 프로젝트팀을 구성하여 신청·접수

지원조건
○ 신청 RFP의 최초 게시일 이후, 투자기관으로부터 20억원 이상 투자(확약 포함)
  받은 중소기업이 투자기관 등과 프로젝트팀을 구성하여 신청·접수
○ 벤처기업 등 일정 요건을 충족하는 중소기업
○ 7년 이하 기업
    `;

    console.log('\n   Testing with sample text from screenshot:');
    console.log('   ' + '-'.repeat(76));
    console.log(testText.split('\n').map(line => '   ' + line).join('\n'));
    console.log('   ' + '-'.repeat(76));

    // Step 4: Extract eligibility criteria
    console.log('\n✅ Step 4: Extracting eligibility criteria...');

    const eligibility = await parser.parseEligibilityCriteria(testText);

    console.log('\n📊 Extraction Results:');
    console.log('   ' + '='.repeat(76));
    console.log(JSON.stringify(eligibility, null, 2));
    console.log('   ' + '='.repeat(76));

    // Step 5: Validate expected vs. actual
    console.log('\n🎯 Step 5: Validation');
    console.log('   Expected:');
    console.log('   - Investment Threshold: ₩2,000,000,000 (20억원)');
    console.log('   - Required Certifications: [벤처기업]');
    console.log('   - Company Age: ≤7 years');

    console.log('\n   Actual:');
    const investment = eligibility?.financialRequirements?.investmentThreshold;
    console.log(`   - Investment Threshold: ${investment ? `₩${investment.minimumAmount.toLocaleString()} (${investment.description})` : '❌ NOT EXTRACTED'}`);

    const certs = eligibility?.certificationRequirements?.required;
    console.log(`   - Required Certifications: ${certs ? `[${certs.join(', ')}]` : '❌ NOT EXTRACTED'}`);

    const age = eligibility?.companyRequirements?.maxCompanyAge;
    console.log(`   - Company Age: ${age ? `≤${age} years` : '❌ NOT EXTRACTED'}`);

    // Step 6: Pattern testing
    console.log('\n🔍 Step 6: Pattern matching diagnostics');

    const investmentPattern = /([\d,\.]+)\s*(억|백만|만)원\s*이상\s*투자/i;
    const match = testText.match(investmentPattern);

    if (match) {
      console.log('   ✓ Investment pattern matched:');
      console.log(`     Full match: "${match[0]}"`);
      console.log(`     Amount: ${match[1]}`);
      console.log(`     Unit: ${match[2]}`);

      const amount = parseFloat(match[1]);
      const unit = match[2];
      const wonAmount = unit === '억' ? amount * 100000000 : amount;
      console.log(`     Converted: ₩${wonAmount.toLocaleString()}`);
    } else {
      console.log('   ❌ Investment pattern DID NOT match');
      console.log('   Pattern tested: /([\d,\.]+)\\s*(억|백만|만)원\\s*이상\\s*투자/i');
    }

    const certPattern = /벤처기업/;
    const certMatch = testText.match(certPattern);
    console.log(`\n   ${certMatch ? '✓' : '❌'} Certification pattern: ${certMatch ? `"${certMatch[0]}"` : 'NOT MATCHED'}`);

    const agePattern = /(\d+)\s*년\s*이하\s*(기업|업체)/;
    const ageMatch = testText.match(agePattern);
    console.log(`   ${ageMatch ? '✓' : '❌'} Age pattern: ${ageMatch ? `"${ageMatch[0]}" → ${ageMatch[1]} years` : 'NOT MATCHED'}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test complete\n');

  } catch (error) {
    console.error('\n❌ Error during extraction:', error);
    throw error;
  }
}

// Run test
testDCPExtraction().catch(console.error);
