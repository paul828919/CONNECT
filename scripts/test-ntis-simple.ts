/**
 * Simple NTIS API test to diagnose 404 issue
 */

import { NTISApiClient } from '../lib/ntis-api/client';

async function testNTISApi() {
  const client = new NTISApiClient({
    apiKey: process.env.NTIS_API_KEY || 'yx6c98kg21bu649u2m8u',
    baseUrl: 'https://www.ntis.go.kr/rndopen/openApi',
    timeout: 30000,
  });

  console.log('Testing NTIS API with different parameter combinations...\n');

  // Test 1: Minimal parameters (what validation script used)
  console.log('Test 1: Minimal parameters');
  try {
    const result1 = await client.searchProjects({
      SRWR: '',
      startPosition: 1,
      displayCnt: 1,
    });
    console.log('✅ SUCCESS - Minimal parameters work');
    console.log(`   Total hits: ${result1.totalHits}\n`);
  } catch (error: any) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 2: With DATE/DESC sort (what scraper uses)
  console.log('Test 2: With DATE/DESC sort');
  try {
    const result2 = await client.searchProjects({
      SRWR: '',
      searchRnkn: 'DATE/DESC',
      startPosition: 1,
      displayCnt: 10,
    });
    console.log('✅ SUCCESS - DATE/DESC sort works');
    console.log(`   Total hits: ${result2.totalHits}\n`);
  } catch (error: any) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 3: With year filter (what scraper uses - might be the problem)
  console.log('Test 3: With year filter (PY=2025/SAME)');
  try {
    const result3 = await client.searchProjects({
      SRWR: '',
      searchRnkn: 'DATE/DESC',
      addQuery: 'PY=2025/SAME',
      startPosition: 1,
      displayCnt: 10,
    });
    console.log('✅ SUCCESS - Year filter works');
    console.log(`   Total hits: ${result3.totalHits}\n`);
  } catch (error: any) {
    console.log(`❌ FAILED - ${error.message}`);
    console.log(`   This is likely the problem! The PY=2025/SAME parameter causes 404\n`);
  }

  // Test 4: With year filter for 2024 instead
  console.log('Test 4: With year filter (PY=2024/SAME)');
  try {
    const result4 = await client.searchProjects({
      SRWR: '',
      searchRnkn: 'DATE/DESC',
      addQuery: 'PY=2024/SAME',
      startPosition: 1,
      displayCnt: 10,
    });
    console.log('✅ SUCCESS - 2024 year filter works');
    console.log(`   Total hits: ${result4.totalHits}\n`);
  } catch (error: any) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  // Test 5: Without year filter
  console.log('Test 5: Without year filter (broader search)');
  try {
    const result5 = await client.searchProjects({
      SRWR: '',
      searchRnkn: 'DATE/DESC',
      startPosition: 1,
      displayCnt: 100,
    });
    console.log('✅ SUCCESS - Broader search works');
    console.log(`   Total hits: ${result5.totalHits}`);
    console.log('   This should be used instead of year filter!\n');
  } catch (error: any) {
    console.log(`❌ FAILED - ${error.message}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recommendation: Remove year filter (addQuery) parameter');
  console.log('The API doesn\'t need year filtering - use DATE/DESC sort instead');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testNTISApi().catch(console.error);
