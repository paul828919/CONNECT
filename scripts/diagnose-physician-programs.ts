/**
 * Diagnose Physician-Scientist Program Matching Issue
 *
 * This script investigates why physician-scientist programs are matching
 * a SOLE_PROPRIETOR tech company when they should only match tertiary hospitals.
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '../lib/matching/algorithm';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('PHYSICIAN-SCIENTIST PROGRAMS DIAGNOSIS');
  console.log('========================================\n');

  // Get Innowave organization
  const innowave = await db.organizations.findFirst({
    where: { name: '이노웨이브' },
  });

  if (!innowave) {
    console.log('❌ Innowave organization not found');
    return;
  }

  console.log('📋 INNOWAVE PROFILE');
  console.log('==================');
  console.log(`Name: ${innowave.name}`);
  console.log(`Type: ${innowave.type}`);
  console.log(`Business Structure: ${innowave.businessStructure}`);
  console.log(`Industry: ${innowave.industrySector}`);
  console.log(`TRL: ${innowave.technologyReadinessLevel}`);

  // Find physician-scientist programs
  const physicianPrograms = await db.funding_programs.findMany({
    where: {
      title: {
        contains: '의사과학자',
      },
      status: 'ACTIVE',
    },
  });

  console.log(`\n✅ Found ${physicianPrograms.length} physician-scientist programs\n`);

  for (const program of physicianPrograms) {
    console.log('\n========================================');
    console.log(`PROGRAM: ${program.title}`);
    console.log('========================================\n');

    // Basic Info
    console.log('📊 BASIC MATCHING FIELDS');
    console.log('----------------------');
    console.log(`Application Start: ${program.applicationStart || 'NULL'}`);
    console.log(`Deadline: ${program.deadline || 'NULL'}`);
    console.log(`Budget: ${program.budgetAmount || 'NULL'}`);
    console.log(`TRL Range: ${program.minTrl || 'NULL'} - ${program.maxTrl || 'NULL'}`);

    // Target Type
    console.log('\n🎯 TARGET TYPE FILTERING');
    console.log('------------------------');
    console.log(`Target Type: ${JSON.stringify(program.targetType)}`);
    console.log(`Innowave Type: ${innowave.type}`);
    if (program.targetType && program.targetType.length > 0) {
      const matches = program.targetType.includes(innowave.type);
      console.log(`Type Match: ${matches ? '✅ YES (will proceed)' : '❌ NO (should filter)'}`);
    } else {
      console.log(`Type Match: ⚠️ No restriction (will proceed)`);
    }

    // Business Structure
    console.log('\n🏢 BUSINESS STRUCTURE FILTERING');
    console.log('-------------------------------');
    console.log(`Allowed Business Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);
    console.log(`Innowave Structure: ${innowave.businessStructure}`);
    if (program.allowedBusinessStructures && program.allowedBusinessStructures.length > 0) {
      const matches = program.allowedBusinessStructures.includes(innowave.businessStructure!);
      console.log(
        `Structure Match: ${matches ? '✅ YES (will proceed)' : '❌ NO (should filter)'}`
      );
    } else {
      console.log(`Structure Match: ⚠️ No restriction (will proceed)`);
    }

    // Required Certifications
    console.log('\n✅ REQUIRED CERTIFICATIONS');
    console.log('-------------------------');
    console.log(`Required Certifications: ${JSON.stringify(program.requiredCertifications)}`);
    console.log(`Innowave Certifications: ${JSON.stringify(innowave.certifications)}`);
    if (program.requiredCertifications && program.requiredCertifications.length > 0) {
      const orgCerts = innowave.certifications || [];
      const missing = program.requiredCertifications.filter((cert) => !orgCerts.includes(cert));
      if (missing.length > 0) {
        console.log(`Missing Certifications: ❌ ${missing.join(', ')} (should filter by eligibility)`);
      } else {
        console.log(`Missing Certifications: ✅ None (will proceed)`);
      }
    } else {
      console.log(`Missing Certifications: ⚠️ No certification requirements`);
    }

    // Eligibility Criteria (Raw JSONB)
    console.log('\n📝 RAW ELIGIBILITY CRITERIA');
    console.log('--------------------------');
    console.log(JSON.stringify(program.eligibilityCriteria, null, 2));

    // Test matching
    console.log('\n🧪 MATCHING TEST');
    console.log('----------------');
    const matches = generateMatches(innowave, [program], 10);
    if (matches.length > 0) {
      console.log(`❌ PROBLEM: Program matched with score ${matches[0].score}`);
      console.log(`Eligibility Level: ${matches[0].eligibilityLevel}`);
      console.log('Score Breakdown:');
      console.log(`  - Industry: ${matches[0].breakdown.industryScore}`);
      console.log(`  - TRL: ${matches[0].breakdown.trlScore}`);
      console.log(`  - Type: ${matches[0].breakdown.typeScore}`);
      console.log(`  - R&D: ${matches[0].breakdown.rdScore}`);
      console.log(`  - Deadline: ${matches[0].breakdown.deadlineScore}`);
    } else {
      console.log('✅ Program correctly filtered out');
    }

    console.log('\n========================================');
  }

  console.log('\n\n========================================');
  console.log('ANALYSIS SUMMARY');
  console.log('========================================\n');
  console.log('🚨 ISSUE: Physician-scientist programs matching tech company');
  console.log('-----------------------------------------------------------\n');
  console.log('EXPECTED BEHAVIOR:');
  console.log('  - Programs requiring 상급종합병원 (tertiary hospitals) should NOT match companies');
  console.log('  - Programs requiring M.D.-Ph.D. researchers should NOT match tech companies\n');
  console.log('LIKELY ROOT CAUSES:');
  console.log('  1. targetType is NULL or includes COMPANY_WITH_RESEARCH_LAB');
  console.log('  2. allowedBusinessStructures is NULL or includes SOLE_PROPRIETOR');
  console.log('  3. Eligibility extraction missed hospital/medical degree requirements\n');
  console.log('RECOMMENDATIONS:');
  console.log('  1. Extract targetType from "상급종합병원" → RESEARCH_INSTITUTE_HOSPITAL');
  console.log('  2. Extract required certifications from "의사과학자(M.D.-Ph.D.)"');
  console.log('  3. Add filters for medical/hospital-specific programs\n');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
