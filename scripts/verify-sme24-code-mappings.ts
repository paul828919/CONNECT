/**
 * SME24 Code Mapping Verification Script
 *
 * Verifies that our code mappings match the actual data from the API.
 * Run with: npx tsx scripts/verify-sme24-code-mappings.ts
 */

import 'dotenv/config';
import { sme24Client } from '../lib/sme24-api/client';
import {
  REGION_CODES,
  CERTIFICATION_CODES,
  BUSINESS_AGE_CODES,
  COMPANY_SCALE_CODES,
  SUPPORT_TYPE_CODES,
  BUSINESS_TYPE_CODES,
} from '../lib/sme24-api/types';
import { mapCodeToRegion } from '../lib/sme24-api/mappers/code-mapper';

async function diagnose() {
  console.log('='.repeat(60));
  console.log('SME24 Code Mapping Verification');
  console.log('After fix per 공고정보 연계 API 가이드_V2.pdf');
  console.log('='.repeat(60));

  // Fetch programs from the last 10 days
  const today = new Date();
  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const result = await sme24Client.fetchAnnouncements({
    strDt: formatDate(tenDaysAgo),
    endDt: formatDate(today),
  });

  if (!result.success || !result.data) {
    console.log('API call failed:', result.error);
    return;
  }

  console.log(`\nTotal programs fetched: ${result.data.length}\n`);

  // Analyze codes used
  const regionCodesUsed = new Map<string, number>();
  const certCodesUsed = new Map<string, number>();
  const ageCodesUsed = new Map<string, number>();
  const scaleCodesUsed = new Map<string, number>();
  const supportTypeCodesUsed = new Map<string, number>();
  const bizTypeCodesUsed = new Map<string, number>();

  for (const program of result.data) {
    // Count region codes
    if (program.areaCd) {
      const codes = program.areaCd.split('|');
      for (const code of codes) {
        if (code.trim()) {
          regionCodesUsed.set(code.trim(), (regionCodesUsed.get(code.trim()) || 0) + 1);
        }
      }
    }

    // Count certification codes
    if (program.needCrtfnCd) {
      const codes = program.needCrtfnCd.split('|');
      for (const code of codes) {
        if (code.trim()) {
          certCodesUsed.set(code.trim(), (certCodesUsed.get(code.trim()) || 0) + 1);
        }
      }
    }

    // Count business age codes
    if (program.ablbizCd) {
      const codes = program.ablbizCd.split('|');
      for (const code of codes) {
        if (code.trim()) {
          ageCodesUsed.set(code.trim(), (ageCodesUsed.get(code.trim()) || 0) + 1);
        }
      }
    }

    // Count company scale codes
    if (program.cmpScaleCd) {
      const codes = program.cmpScaleCd.split('|');
      for (const code of codes) {
        if (code.trim()) {
          scaleCodesUsed.set(code.trim(), (scaleCodesUsed.get(code.trim()) || 0) + 1);
        }
      }
    }

    // Count support type codes
    if (program.sportTypeCd) {
      supportTypeCodesUsed.set(program.sportTypeCd, (supportTypeCodesUsed.get(program.sportTypeCd) || 0) + 1);
    }

    // Count business type codes
    if (program.bizTypeCd) {
      bizTypeCodesUsed.set(program.bizTypeCd, (bizTypeCodesUsed.get(program.bizTypeCd) || 0) + 1);
    }
  }

  // Report region codes
  console.log('--- REGION CODES (지역코드) ---');
  console.log('PDF Reference: Page 7-8');
  const sortedRegions = Array.from(regionCodesUsed.entries()).sort((a, b) => b[1] - a[1]);
  let regionMatches = 0;
  let regionMisses = 0;
  for (const [code, count] of sortedRegions.slice(0, 15)) {
    const name = REGION_CODES[code as keyof typeof REGION_CODES];
    const mapped = mapCodeToRegion(code);
    const status = name ? '✓' : '✗';
    if (name) regionMatches++; else regionMisses++;
    console.log(`  ${status} ${code}: ${name || 'NOT IN OUR MAP'} (count: ${count}, KoreanRegion: ${mapped || 'null'})`);
  }
  console.log(`  Summary: ${regionMatches} matched, ${regionMisses} not in map\n`);

  // Report certification codes
  console.log('--- CERTIFICATION CODES (기업인증/확인유형코드) ---');
  console.log('PDF Reference: Page 5-6');
  const sortedCerts = Array.from(certCodesUsed.entries()).sort((a, b) => b[1] - a[1]);
  let certMatches = 0;
  let certMisses = 0;
  for (const [code, count] of sortedCerts.slice(0, 15)) {
    const name = CERTIFICATION_CODES[code as keyof typeof CERTIFICATION_CODES];
    const status = name ? '✓' : '✗';
    if (name) certMatches++; else certMisses++;
    console.log(`  ${status} ${code}: ${name || 'NOT IN OUR MAP'} (count: ${count})`);
  }
  console.log(`  Summary: ${certMatches} matched, ${certMisses} not in map\n`);

  // Report business age codes
  console.log('--- BUSINESS AGE CODES (업력구간코드) ---');
  console.log('PDF Reference: Page 6');
  const sortedAges = Array.from(ageCodesUsed.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let ageMatches = 0;
  let ageMisses = 0;
  for (const [code, count] of sortedAges) {
    const name = BUSINESS_AGE_CODES[code as keyof typeof BUSINESS_AGE_CODES];
    const status = name ? '✓' : '✗';
    if (name) ageMatches++; else ageMisses++;
    console.log(`  ${status} ${code}: ${name || 'NOT IN OUR MAP'} (count: ${count})`);
  }
  console.log(`  Summary: ${ageMatches} matched, ${ageMisses} not in map\n`);

  // Report company scale codes
  console.log('--- COMPANY SCALE CODES (기업분류기준코드) ---');
  console.log('PDF Reference: Page 5');
  const sortedScales = Array.from(scaleCodesUsed.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let scaleMatches = 0;
  let scaleMisses = 0;
  for (const [code, count] of sortedScales) {
    const name = COMPANY_SCALE_CODES[code as keyof typeof COMPANY_SCALE_CODES];
    const status = name ? '✓' : '✗';
    if (name) scaleMatches++; else scaleMisses++;
    console.log(`  ${status} ${code}: ${name || 'NOT IN OUR MAP'} (count: ${count})`);
  }
  console.log(`  Summary: ${scaleMatches} matched, ${scaleMisses} not in map\n`);

  // Report support type codes
  console.log('--- SUPPORT TYPE CODES (지원유형코드) ---');
  console.log('PDF Reference: Page 6-7');
  const sortedSupport = Array.from(supportTypeCodesUsed.entries()).sort((a, b) => b[1] - a[1]);
  let supportMatches = 0;
  let supportMisses = 0;
  for (const [code, count] of sortedSupport.slice(0, 12)) {
    const name = SUPPORT_TYPE_CODES[code as keyof typeof SUPPORT_TYPE_CODES];
    const status = name ? '✓' : '✗';
    if (name) supportMatches++; else supportMisses++;
    console.log(`  ${status} ${code}: ${name || 'NOT IN OUR MAP'} (count: ${count})`);
  }
  console.log(`  Summary: ${supportMatches} matched, ${supportMisses} not in map\n`);

  // Report business type codes
  console.log('--- BUSINESS TYPE CODES (사업유형코드) ---');
  console.log('PDF Reference: Page 6');
  const sortedBiz = Array.from(bizTypeCodesUsed.entries()).sort((a, b) => b[1] - a[1]);
  let bizMatches = 0;
  let bizMisses = 0;
  for (const [code, count] of sortedBiz.slice(0, 12)) {
    const name = BUSINESS_TYPE_CODES[code as keyof typeof BUSINESS_TYPE_CODES];
    const status = name ? '✓' : '✗';
    if (name) bizMatches++; else bizMisses++;
    console.log(`  ${status} ${code}: ${name || 'NOT IN OUR MAP'} (count: ${count})`);
  }
  console.log(`  Summary: ${bizMatches} matched, ${bizMisses} not in map\n`);

  // Show sample program
  console.log('--- SAMPLE PROGRAM WITH DETAILED CODES ---');
  const sample = result.data.find(p => p.areaCd && p.needCrtfnCd && p.ablbizCd);
  if (sample) {
    console.log(`Title: ${sample.pblancNm?.substring(0, 60)}...`);
    console.log(`ID: ${sample.pblancSeq}`);
    console.log(`Region Code: ${sample.areaCd} → Name: ${sample.areaNm}`);
    console.log(`Cert Code: ${sample.needCrtfnCd} → Name: ${sample.needCrtfn}`);
    console.log(`Age Code: ${sample.ablbizCd} → Name: ${sample.ablbiz}`);
    console.log(`Scale Code: ${sample.cmpScaleCd} → Name: ${sample.cmpScale}`);
  } else {
    console.log('No sample program found with all code fields populated');
  }

  console.log('\n' + '='.repeat(60));
  const totalMisses = regionMisses + certMisses + ageMisses + scaleMisses;
  if (totalMisses === 0) {
    console.log('✓ ALL CODE MAPPINGS VERIFIED SUCCESSFULLY!');
  } else {
    console.log(`⚠ Found ${totalMisses} unmapped codes - may need to add to types.ts`);
  }
  console.log('='.repeat(60));
}

diagnose().catch(console.error);
