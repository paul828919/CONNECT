/**
 * Direct Test: Nuclear Program Classification
 *
 * Tests extractCategoryFromMinistryAndAgency with exact values from database
 */

import { extractCategoryFromMinistryAndAgency } from '../lib/scraping/parsers/agency-mapper';

const title = '2025년도 하반기 원자력정책연구사업 재공고';
const ministry = '과학기술정보통신부';
const agency = '한국연구재단';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  Direct Classification Test                                ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

console.log(`📋 Title: ${title}`);
console.log(`🏛️  Ministry: ${ministry}`);
console.log(`🏢 Agency: ${agency}\n`);

const result = extractCategoryFromMinistryAndAgency(ministry, agency, title);

console.log('═══════════════════════════════════════════════════════════');
console.log('RESULT:');
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Category: ${result.category}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Source: ${result.source}`);
console.log(`Context: ${result.context}`);
console.log(`Requires Manual Review: ${result.requiresManualReview}`);
console.log(`\nKeywords (${result.keywords.length}): ${result.keywords.join(', ')}\n`);

console.log('═══════════════════════════════════════════════════════════');
console.log(result.category === 'ENERGY' ? '✅ CORRECT: ENERGY' : `❌ WRONG: ${result.category} (expected ENERGY)`);
console.log(result.keywords.includes('원자력') ? '✅ HAS: 원자력 keyword' : '❌ MISSING: 원자력 keyword');
console.log('═══════════════════════════════════════════════════════════\n');
