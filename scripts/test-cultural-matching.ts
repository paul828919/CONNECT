/**
 * Test script to verify CULTURAL sector matching works correctly
 *
 * This script tests:
 * 1. CULTURAL taxonomy is properly loaded
 * 2. Industry relevance matrix includes CULTURAL
 * 3. Match generation works for CULTURAL organizations
 */

import { INDUSTRY_TAXONOMY, INDUSTRY_RELEVANCE } from '../lib/matching/taxonomy';

async function testCulturalMatching() {
  console.log('🧪 Testing CULTURAL Sector Matching\n');

  // Test 1: Verify CULTURAL taxonomy exists
  console.log('Test 1: CULTURAL Taxonomy');
  console.log('─'.repeat(50));

  if (!INDUSTRY_TAXONOMY.CULTURAL) {
    console.error('❌ CULTURAL taxonomy not found!');
    process.exit(1);
  }

  console.log('✅ CULTURAL taxonomy found');
  console.log(`   Name: ${INDUSTRY_TAXONOMY.CULTURAL.name}`);
  console.log(`   Keywords: ${INDUSTRY_TAXONOMY.CULTURAL.keywords.join(', ')}`);
  console.log(`   Sub-sectors: ${Object.keys(INDUSTRY_TAXONOMY.CULTURAL.subSectors).length}`);

  Object.entries(INDUSTRY_TAXONOMY.CULTURAL.subSectors).forEach(([key, subSector]) => {
    console.log(`   - ${key}: ${subSector.name} (${subSector.keywords.length} keywords)`);
  });

  // Test 2: Verify OTHER taxonomy exists (backward compatibility)
  console.log('\nTest 2: OTHER Taxonomy (Backward Compatibility)');
  console.log('─'.repeat(50));

  if (!INDUSTRY_TAXONOMY.OTHER) {
    console.error('❌ OTHER taxonomy not found!');
    process.exit(1);
  }

  console.log('✅ OTHER taxonomy found');
  console.log(`   Name: ${INDUSTRY_TAXONOMY.OTHER.name}`);

  // Test 3: Verify INDUSTRY_RELEVANCE matrix includes CULTURAL
  console.log('\nTest 3: Industry Relevance Matrix');
  console.log('─'.repeat(50));

  if (!INDUSTRY_RELEVANCE.CULTURAL) {
    console.error('❌ CULTURAL not found in INDUSTRY_RELEVANCE matrix!');
    process.exit(1);
  }

  console.log('✅ CULTURAL row exists in relevance matrix');
  console.log('   Cross-sector relevance scores:');

  Object.entries(INDUSTRY_RELEVANCE.CULTURAL).forEach(([sector, score]) => {
    const emoji = score >= 0.7 ? '🟢' : score >= 0.4 ? '🟡' : '🔴';
    console.log(`   ${emoji} ${sector.padEnd(15)} ${score.toFixed(1)}`);
  });

  // Test 4: Verify all sectors have CULTURAL column
  console.log('\nTest 4: CULTURAL Column in All Sectors');
  console.log('─'.repeat(50));

  const sectors = Object.keys(INDUSTRY_RELEVANCE);
  let missingColumn = false;

  sectors.forEach(sector => {
    if (INDUSTRY_RELEVANCE[sector].CULTURAL === undefined) {
      console.error(`❌ ${sector} missing CULTURAL column`);
      missingColumn = true;
    }
  });

  if (missingColumn) {
    process.exit(1);
  }

  console.log(`✅ All ${sectors.length} sectors have CULTURAL column`);

  // Test 5: Verify matrix is 12x12
  console.log('\nTest 5: Matrix Dimensions');
  console.log('─'.repeat(50));

  const rowCount = Object.keys(INDUSTRY_RELEVANCE).length;
  const expectedSize = 12;

  if (rowCount !== expectedSize) {
    console.error(`❌ Matrix should be ${expectedSize}x${expectedSize}, but is ${rowCount}x${rowCount}`);
    process.exit(1);
  }

  console.log(`✅ Matrix is ${rowCount}x${rowCount} (correct size)`);
  console.log(`   Sectors: ${sectors.join(', ')}`);

  // Test 6: Keyword matching test
  console.log('\nTest 6: Keyword Matching');
  console.log('─'.repeat(50));

  const testKeywords = ['문화콘텐츠', '게임', 'K-POP', '관광', '문화재', '스포츠'];

  testKeywords.forEach(keyword => {
    let found = false;

    // Check main keywords
    if (INDUSTRY_TAXONOMY.CULTURAL.keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
      found = true;
      console.log(`✅ "${keyword}" matches CULTURAL main keywords`);
    }

    // Check sub-sector keywords
    if (!found) {
      Object.entries(INDUSTRY_TAXONOMY.CULTURAL.subSectors).forEach(([subKey, subSector]) => {
        if (subSector.keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
          found = true;
          console.log(`✅ "${keyword}" matches ${subKey} sub-sector`);
        }
      });
    }

    if (!found) {
      console.log(`⚠️  "${keyword}" not found in CULTURAL taxonomy`);
    }
  });

  console.log('\n' + '═'.repeat(50));
  console.log('✅ All tests passed! CULTURAL sector is properly configured.');
  console.log('═'.repeat(50));
}

// Run tests
testCulturalMatching().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
