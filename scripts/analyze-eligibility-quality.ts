/**
 * Analyze eligibility extraction quality
 * Run: npx tsx scripts/analyze-eligibility-quality.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  extractEligibilityFromText,
  hasExtractedEligibility,
} from '../lib/sme24-api/mappers/eligibility-text-extractor';

const prisma = new PrismaClient();

async function analyzeExtractionQuality() {
  console.log('=== 추출 품질 분석 ===\n');

  // Get all ACTIVE programs
  const programs = await prisma.sme_programs.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      title: true,
      description: true,
      supportTarget: true,
      targetRegionCodes: true,
      targetCompanyScale: true,
      minEmployeeCount: true,
      maxEmployeeCount: true,
      minSalesAmount: true,
      maxSalesAmount: true,
      minBusinessAge: true,
      maxBusinessAge: true,
    },
  });

  const stats = {
    total: programs.length,
    // DB coverage
    dbHasRegion: 0,
    dbHasScale: 0,
    dbHasEmployees: 0,
    dbHasRevenue: 0,
    dbHasAge: 0,
    // Extraction potential (what could be extracted from text)
    textHasRegion: 0,
    textHasScale: 0,
    textHasEmployees: 0,
    textHasRevenue: 0,
    textHasAge: 0,
    // Gaps (text has data but DB doesn't)
    gapRegion: 0,
    gapScale: 0,
    gapEmployees: 0,
    gapRevenue: 0,
    gapAge: 0,
  };

  for (const p of programs) {
    // Check DB coverage
    if (p.targetRegionCodes && p.targetRegionCodes.length > 0) stats.dbHasRegion++;
    if (p.targetCompanyScale && p.targetCompanyScale.length > 0) stats.dbHasScale++;
    if (p.minEmployeeCount !== null || p.maxEmployeeCount !== null) stats.dbHasEmployees++;
    if (p.minSalesAmount !== null || p.maxSalesAmount !== null) stats.dbHasRevenue++;
    if (p.minBusinessAge !== null || p.maxBusinessAge !== null) stats.dbHasAge++;

    // Extract from text
    const extracted = extractEligibilityFromText(p.title, p.description, p.supportTarget);

    if (extracted.regions.length > 0) stats.textHasRegion++;
    if (extracted.companyScale.length > 0) stats.textHasScale++;
    if (extracted.minEmployees !== null || extracted.maxEmployees !== null)
      stats.textHasEmployees++;
    if (extracted.minRevenue !== null || extracted.maxRevenue !== null) stats.textHasRevenue++;
    if (extracted.minBusinessAge !== null || extracted.maxBusinessAge !== null)
      stats.textHasAge++;

    // Check gaps
    if (extracted.regions.length > 0 && (!p.targetRegionCodes || p.targetRegionCodes.length === 0))
      stats.gapRegion++;
    if (
      extracted.companyScale.length > 0 &&
      (!p.targetCompanyScale || p.targetCompanyScale.length === 0)
    )
      stats.gapScale++;
    if (
      (extracted.minEmployees !== null || extracted.maxEmployees !== null) &&
      p.minEmployeeCount === null &&
      p.maxEmployeeCount === null
    )
      stats.gapEmployees++;
    if (
      (extracted.minRevenue !== null || extracted.maxRevenue !== null) &&
      p.minSalesAmount === null &&
      p.maxSalesAmount === null
    )
      stats.gapRevenue++;
    if (
      (extracted.minBusinessAge !== null || extracted.maxBusinessAge !== null) &&
      p.minBusinessAge === null &&
      p.maxBusinessAge === null
    )
      stats.gapAge++;
  }

  console.log('필드             | DB 저장  | 텍스트 추출 | 미반영 Gap');
  console.log('-----------------|----------|-------------|------------');
  console.log(
    `Region (지역)    | ${stats.dbHasRegion.toString().padStart(4)} (${Math.round((100 * stats.dbHasRegion) / stats.total)}%) | ${stats.textHasRegion.toString().padStart(4)} (${Math.round((100 * stats.textHasRegion) / stats.total)}%)    | ${stats.gapRegion}`
  );
  console.log(
    `Company Scale    | ${stats.dbHasScale.toString().padStart(4)} (${Math.round((100 * stats.dbHasScale) / stats.total)}%) | ${stats.textHasScale.toString().padStart(4)} (${Math.round((100 * stats.textHasScale) / stats.total)}%)    | ${stats.gapScale}`
  );
  console.log(
    `Employees        | ${stats.dbHasEmployees.toString().padStart(4)} (${Math.round((100 * stats.dbHasEmployees) / stats.total)}%)  | ${stats.textHasEmployees.toString().padStart(4)} (${Math.round((100 * stats.textHasEmployees) / stats.total)}%)     | ${stats.gapEmployees}`
  );
  console.log(
    `Revenue          | ${stats.dbHasRevenue.toString().padStart(4)} (${Math.round((100 * stats.dbHasRevenue) / stats.total)}%)  | ${stats.textHasRevenue.toString().padStart(4)} (${Math.round((100 * stats.textHasRevenue) / stats.total)}%)     | ${stats.gapRevenue}`
  );
  console.log(
    `Business Age     | ${stats.dbHasAge.toString().padStart(4)} (${Math.round((100 * stats.dbHasAge) / stats.total)}%)  | ${stats.textHasAge.toString().padStart(4)} (${Math.round((100 * stats.textHasAge) / stats.total)}%)     | ${stats.gapAge}`
  );

  console.log(`\nTotal programs: ${stats.total}`);

  // Show sample gaps for each field
  console.log('\n=== 샘플: 텍스트에서 추출 가능하나 DB에 미반영된 프로그램 ===\n');

  let sampleCount = 0;
  for (const p of programs) {
    if (sampleCount >= 5) break;

    const extracted = extractEligibilityFromText(p.title, p.description, p.supportTarget);

    const hasGap =
      (extracted.regions.length > 0 &&
        (!p.targetRegionCodes || p.targetRegionCodes.length === 0)) ||
      (extracted.companyScale.length > 0 &&
        (!p.targetCompanyScale || p.targetCompanyScale.length === 0));

    if (hasGap) {
      console.log(`Title: ${p.title.substring(0, 60)}...`);
      console.log(`  DB Region: ${JSON.stringify(p.targetRegionCodes)}`);
      console.log(`  Extracted Region: ${JSON.stringify(extracted.regions)}`);
      console.log(`  DB Scale: ${JSON.stringify(p.targetCompanyScale)}`);
      console.log(`  Extracted Scale: ${JSON.stringify(extracted.companyScale)}`);
      console.log('');
      sampleCount++;
    }
  }
}

analyzeExtractionQuality()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
