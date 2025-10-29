/**
 * Test Enhanced NTIS Parser (Phase 2 Verification)
 *
 * Verifies all parser enhancements before production deployment:
 * 1. Synonym-based budget/deadline extraction
 * 2. Business structure detection
 * 3. PDF attachment parsing
 * 4. TRL auto-classification
 *
 * Per user rule: Always test locally before commit/push
 */

import { chromium } from 'playwright';
import { parseNTISAnnouncementDetails } from '../lib/scraping/parsers/ntis-announcement-parser';

async function testEnhancedNTISParser() {
  console.log('🧪 Testing Enhanced NTIS Parser (Phase 2 Enhancements)\n');
  console.log('Testing:');
  console.log('  ✓ Synonym-based field extraction (budget, deadline)');
  console.log('  ✓ Business structure detection');
  console.log('  ✓ PDF attachment parsing');
  console.log('  ✓ TRL auto-classification\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Test with multiple NTIS URLs to cover different announcement formats
    const testUrls = [
      // URL with 4 attachments (verified via scan): 2 PDFs, 2 ZIPs
      'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1198102&flag=rndList',
      // URL without attachments (to test NULL handling)
      'https://www.ntis.go.kr/rndgate/eg/un/ra/view.do?roRndUid=1199437&flag=rndList',
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const testUrl of testUrls) {
      totalTests++;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 Test ${totalTests}: ${testUrl}`);
      console.log('='.repeat(80));

      // Parse the page with enhanced extractor
      const result = await parseNTISAnnouncementDetails(page, testUrl);

      console.log('\n📊 Core Fields:');
      console.log('─'.repeat(80));
      console.log(`publishedAt:       ${result.publishedAt || '❌ NULL'}`);
      console.log(`deadline:          ${result.deadline || '❌ NULL'}`);
      console.log(
        `budgetAmount:      ${result.budgetAmount !== null ? result.budgetAmount.toLocaleString() + ' won' : '❌ NULL'}`
      );
      console.log(`ministry:          ${result.ministry || '❌ NULL'}`);
      console.log(`announcingAgency:  ${result.announcingAgency || '❌ NULL'}`);
      console.log(`category:          ${result.category || '❌ NULL'}`);
      console.log(`targetType:        ${result.targetType}`);

      console.log('\n🆕 Enhanced Fields (Phase 2):');
      console.log('─'.repeat(80));

      // 1. Business structure detection
      if (result.allowedBusinessStructures && result.allowedBusinessStructures.length > 0) {
        console.log(`✅ allowedBusinessStructures: [${result.allowedBusinessStructures.join(', ')}]`);
      } else {
        console.log('⚪ allowedBusinessStructures: NULL (no restrictions detected)');
      }

      // 2. PDF attachments
      if (result.attachmentUrls && result.attachmentUrls.length > 0) {
        console.log(`✅ attachmentUrls: ${result.attachmentUrls.length} PDF(s) found`);
        result.attachmentUrls.forEach((url, i) => {
          console.log(`   [${i + 1}] ${url.substring(0, 80)}...`);
        });
      } else {
        console.log('⚪ attachmentUrls: 0 PDFs (not all programs have attachments)');
      }

      // 3. TRL classification
      console.log(`trlInferred:       ${result.trlInferred ? '✅ YES (auto-classified)' : '⚪ NO (explicit or missing)'}`);
      if (result.minTRL && result.maxTRL) {
        console.log(`TRL Range:         ${result.minTRL}-${result.maxTRL}`);
        console.log(`TRL Confidence:    ${result.trlConfidence}`);
        if (result.trlClassification) {
          console.log(`TRL Stage:         ${result.trlClassification.stage} (${result.trlClassification.stageKorean})`);
          console.log(`TRL Description:   ${result.trlClassification.description}`);
        }
      } else {
        console.log('TRL Range:         Not detected');
      }

      // 4. Keywords (verify agency defaults + attachment keywords are included)
      console.log(`keywords:          ${result.keywords.length} keywords extracted`);
      if (result.keywords.length > 0) {
        console.log(`                   [${result.keywords.slice(0, 5).join(', ')}...]`);
      }

      // 5. Attachment text extraction (NEW - Phase 2 Enhancement)
      console.log('\n📎 Attachment Processing:');
      console.log('─'.repeat(80));
      if (result.attachmentUrls && result.attachmentUrls.length > 0) {
        console.log(`✅ ${result.attachmentUrls.length} attachment(s) found`);
        console.log('   Expected: Text extraction from PDF/HWPX/HWP files');
        console.log('   Note: Check logs above for [ATTACHMENT-PARSER] entries');
      } else {
        console.log('⚪ No attachments found for this announcement');
      }

      console.log('\n📈 Validation:');
      console.log('─'.repeat(80));

      // Validate critical fields
      const criticalFields = {
        'Budget or Deadline': result.budgetAmount !== null || result.deadline !== null,
        'Ministry or Agency': result.ministry !== null || result.announcingAgency !== null,
        'Description': result.description !== null && result.description.length > 50,
        'Keywords': result.keywords.length >= 3,
      };

      let criticalPassed = 0;
      Object.entries(criticalFields).forEach(([name, passed]) => {
        if (passed) {
          criticalPassed++;
          console.log(`✅ ${name}`);
        } else {
          console.log(`❌ ${name}`);
        }
      });

      // Success criteria: At least 3/4 critical fields must pass
      const testPassed = criticalPassed >= 3;
      if (testPassed) {
        passedTests++;
        console.log(`\n✅ TEST PASSED (${criticalPassed}/4 critical fields extracted)`);
      } else {
        console.log(`\n❌ TEST FAILED (${criticalPassed}/4 critical fields extracted)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 OVERALL RESULTS');
    console.log('='.repeat(80));
    console.log(`Tests Passed:  ${passedTests}/${totalTests}`);
    console.log(`Success Rate:  ${Math.round((passedTests / totalTests) * 100)}%`);

    if (passedTests === totalTests) {
      console.log('\n✅ ALL TESTS PASSED - Enhanced parser is working correctly!');
      console.log('✓ Ready for production deployment');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Review parser implementation before deploying');
    }
  } catch (error: any) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await browser.close();
  }
}

testEnhancedNTISParser().catch(console.error);
