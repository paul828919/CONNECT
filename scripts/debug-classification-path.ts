/**
 * Debug Classification Path
 *
 * This script traces the EXACT code path taken when classifying the Nuclear program
 * to identify why it's taking the fallback path instead of taxonomy classification
 */

import { classifyWithOfficialTaxonomy } from '../lib/scraping/parsers/official-category-mapper';
import { extractCategoryFromMinistryAndAgency } from '../lib/scraping/parsers/agency-mapper';

const title = '2025년도 하반기 원자력정책연구사업 재공고';
const ministry = '과학기술정보통신부';
const agency = '한국연구재단';

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  Classification Path Debug                                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Input Parameters:');
console.log(`   Title: ${title}`);
console.log(`   Ministry: ${ministry}`);
console.log(`   Agency: ${agency}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('STEP 1: Call classifyWithOfficialTaxonomy()');
console.log('═══════════════════════════════════════════════════════════\n');

const taxonomyResult = classifyWithOfficialTaxonomy(title, ministry, agency);

console.log('📊 Taxonomy Result:');
console.log(`   Category: ${taxonomyResult.category}`);
console.log(`   Confidence: ${taxonomyResult.confidence}`);
console.log(`   Source: ${taxonomyResult.source}`);
console.log(`   Matched Keywords (${taxonomyResult.matchedKeywords.length}): ${taxonomyResult.matchedKeywords.join(', ')}`);
console.log(`   ✓ Contains "원자력": ${taxonomyResult.matchedKeywords.includes('원자력') ? 'YES' : 'NO'}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('STEP 2: Call extractCategoryFromMinistryAndAgency()');
console.log('═══════════════════════════════════════════════════════════\n');

const finalResult = extractCategoryFromMinistryAndAgency(ministry, agency, title);

console.log('📊 Final Result:');
console.log(`   Category: ${finalResult.category}`);
console.log(`   Confidence: ${finalResult.confidence}`);
console.log(`   Source: ${finalResult.source}`);
console.log(`   Context: ${finalResult.context}`);
console.log(`   Keywords (${finalResult.keywords.length}): ${finalResult.keywords.join(', ')}`);
console.log(`   ✓ Contains "원자력": ${finalResult.keywords.includes('원자력') ? 'YES' : 'NO'}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log('ANALYSIS');
console.log('═══════════════════════════════════════════════════════════\n');

// Check which path was taken
const hasOnlyAgencyDefaults = finalResult.keywords.some(k => ['ICT', '정보통신', '과학기술'].includes(k));
const hasTaxonomyKeywords = finalResult.keywords.includes('원자력');

console.log('Path Detection:');
if (taxonomyResult.confidence === 'high' && hasTaxonomyKeywords) {
  console.log('  ✅ PHASE 1: High confidence taxonomy path (lines 1070-1094)');
} else if (taxonomyResult.confidence === 'medium' && hasTaxonomyKeywords) {
  console.log('  ✅ PHASE 1: Medium confidence + cross-domain override (lines 1128-1146)');
} else if (hasOnlyAgencyDefaults && !hasTaxonomyKeywords) {
  console.log('  ❌ PHASE 2: Fallback path with agency defaults only (lines 1230-1239)');
  console.log('  ⚠️  This is the WRONG path - taxonomy was bypassed!');
} else {
  console.log('  ⚠️  UNKNOWN PATH - needs investigation');
}

console.log('\nExpected vs Actual:');
console.log(`  Expected Category: ENERGY`);
console.log(`  Actual Category: ${finalResult.category}`);
console.log(`  Match: ${finalResult.category === 'ENERGY' ? '✅' : '❌'}`);

console.log(`\n  Expected Keywords: [..., "원자력", ...]`);
console.log(`  Actual Keywords: [${finalResult.keywords.join(', ')}]`);
console.log(`  Has "원자력": ${finalResult.keywords.includes('원자력') ? '✅' : '❌'}`);

console.log('\n═══════════════════════════════════════════════════════════');
if (finalResult.category === 'ENERGY' && finalResult.keywords.includes('원자력')) {
  console.log('✅ SUCCESS: Classification is correct');
} else {
  console.log('❌ FAILURE: Classification is incorrect');
  console.log('\nDEBUG INFO:');
  console.log(`  Taxonomy returned: ${taxonomyResult.category} (confidence: ${taxonomyResult.confidence})`);
  console.log(`  But final result is: ${finalResult.category}`);
  console.log(`  This indicates the taxonomy result was overridden or ignored`);
}
console.log('═══════════════════════════════════════════════════════════\n');
