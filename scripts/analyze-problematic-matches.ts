/**
 * Analyze Problematic Matches
 *
 * This script investigates two announcements that were incorrectly matched to Innowave:
 * 1. 2025년 연구개발특구육성사업(RD) 지원 공고 (Score: 84)
 * 2. 2026년도 바이오접합체 기술선도형 플랫폼 구축 신규과제 공모 (Score: 81)
 */

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('PROBLEMATIC MATCHES ANALYSIS');
  console.log('========================================\n');

  // Get Innowave organization profile
  const innowave = await db.organizations.findFirst({
    where: { name: '이노웨이브' },
  });

  if (!innowave) {
    console.log('❌ Innowave organization not found');
    return;
  }

  console.log('📋 INNOWAVE ORGANIZATION PROFILE');
  console.log('================================');
  console.log(`Name: ${innowave.name}`);
  console.log(`Type: ${innowave.type}`);
  console.log(`Business Structure: ${innowave.businessStructure}`);
  console.log(`Industry: ${innowave.industrySector}`);
  console.log(`Employee Count: ${innowave.employeeCount}`);
  console.log(`Revenue Range: ${innowave.revenueRange}`);
  console.log(`TRL: ${innowave.technologyReadinessLevel}`);
  console.log(`R&D Experience: ${innowave.rdExperience}`);
  console.log(`Certifications: ${JSON.stringify(innowave.certifications)}`);
  console.log(`Gov Certifications: ${JSON.stringify(innowave.governmentCertifications)}`);
  console.log(`Business Established: ${innowave.businessEstablishedDate}`);
  console.log(`Investment History: ${innowave.investmentHistory ? JSON.stringify(innowave.investmentHistory) : 'null'}`);

  // Get the two problematic matches
  const matches = await db.funding_matches.findMany({
    where: {
      organizationId: innowave.id,
      programId: {
        in: [
          'f3a4a80b-9150-4772-8644-6b2a2c77da23', // 연구개발특구
          '0b5115bf-7f68-4e22-895f-6e55e470624e', // 바이오접합체
        ],
      },
    },
    include: {
      funding_programs: {
        include: {
          scraping_job: true,
        },
      },
    },
  });

  for (const match of matches) {
    const program = match.funding_programs;
    console.log('\n\n========================================');
    console.log(`ANNOUNCEMENT: ${program.title}`);
    console.log('========================================');

    // Basic Info
    console.log('\n📊 BASIC INFO');
    console.log('-------------');
    console.log(`ID: ${program.id}`);
    console.log(`Title: ${program.title}`);
    console.log(`Agency: ${program.agencyId}`);
    console.log(`Type: ${program.announcementType}`);
    console.log(`URL: ${program.announcementUrl}`);

    // Critical Fields
    console.log('\n⚠️ CRITICAL MATCHING FIELDS');
    console.log('---------------------------');
    console.log(`Application Start: ${program.applicationStart || '❌ NULL (MISSING!)'}`);
    console.log(`Deadline: ${program.deadline || '❌ NULL (MISSING!)'}`);
    console.log(`Budget: ${program.budgetAmount ? `₩${program.budgetAmount.toLocaleString()}` : '❌ NULL (MISSING!)'}`);

    // Target Type
    console.log('\n🎯 TARGET TYPE');
    console.log('--------------');
    console.log(`Target Type: ${JSON.stringify(program.targetType)}`);
    console.log(`Allowed Business Structures: ${JSON.stringify(program.allowedBusinessStructures)}`);

    // TRL
    console.log('\n🔬 TRL REQUIREMENTS');
    console.log('------------------');
    console.log(`Min TRL: ${program.minTrl || 'null'}`);
    console.log(`Max TRL: ${program.maxTrl || 'null'}`);
    console.log(`TRL Inferred: ${program.trlInferred}`);
    console.log(`TRL Confidence: ${program.trlConfidence || 'null'}`);

    // Eligibility
    console.log('\n✅ ELIGIBILITY REQUIREMENTS');
    console.log('--------------------------');
    console.log(`Required Certifications: ${JSON.stringify(program.requiredCertifications)}`);
    console.log(`Preferred Certifications: ${JSON.stringify(program.preferredCertifications)}`);
    console.log(`Required Min Employees: ${program.requiredMinEmployees || 'null'}`);
    console.log(`Required Max Employees: ${program.requiredMaxEmployees || 'null'}`);
    console.log(`Required Investment: ${program.requiredInvestmentAmount || 'null'}`);
    console.log(`Required Operating Years: ${program.requiredOperatingYears || 'null'}`);
    console.log(`Max Operating Years: ${program.maxOperatingYears || 'null'}`);
    console.log(`Eligibility Confidence: ${program.eligibilityConfidence}`);
    console.log(`Manual Review Required: ${program.manualReviewRequired}`);

    // Raw Eligibility Criteria
    console.log('\n📝 RAW ELIGIBILITY CRITERIA (JSONB)');
    console.log('----------------------------------');
    console.log(JSON.stringify(program.eligibilityCriteria, null, 2));

    // Match Score Breakdown
    console.log('\n📈 MATCH SCORE BREAKDOWN');
    console.log('-----------------------');
    console.log(`Total Score: ${match.score}`);
    const explanation = match.explanation as any;
    if (explanation?.reasons) {
      console.log('Reasons:');
      explanation.reasons.forEach((reason: string, i: number) => {
        console.log(`  ${i + 1}. ${reason}`);
      });
    }
    if (explanation?.warnings) {
      console.log('Warnings:');
      explanation.warnings.forEach((warning: string, i: number) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
    }

    // Scraping Job Data
    if (program.scraping_job) {
      const scrapingJob = program.scraping_job;
      console.log('\n🔍 SCRAPING JOB DATA');
      console.log('-------------------');
      console.log(`Scraping Status: ${scrapingJob.scrapingStatus}`);
      console.log(`Processing Status: ${scrapingJob.processingStatus}`);
      console.log(`Attachment Count: ${scrapingJob.attachmentCount}`);
      console.log(`Attachment Filenames: ${JSON.stringify(scrapingJob.attachmentFilenames)}`);
      console.log(`Attachment Folder: ${scrapingJob.attachmentFolder}`);

      console.log('\n📄 DETAIL PAGE DATA (First 2000 chars)');
      console.log('--------------------------------------');
      const detailPageData = scrapingJob.detailPageData as any;
      console.log(JSON.stringify(detailPageData, null, 2).substring(0, 2000));
    }

    console.log('\n========================================');
  }

  console.log('\n\n========================================');
  console.log('ANALYSIS SUMMARY');
  console.log('========================================\n');

  const rdSpecialZone = matches.find(m =>
    m.funding_programs.title.includes('연구개발특구')
  );

  const bioAdvanced = matches.find(m =>
    m.funding_programs.title.includes('바이오')
  );

  if (rdSpecialZone) {
    const program = rdSpecialZone.funding_programs;
    console.log('🚨 ISSUE 1: 2025년 연구개발특구육성사업(RD) 지원 공고');
    console.log('-----------------------------------------------------');
    console.log('PROBLEM: This is a consolidated announcement lacking critical details');
    console.log(`  - Application Start: ${program.applicationStart ? 'PRESENT' : '❌ MISSING'}`);
    console.log(`  - Deadline: ${program.deadline ? 'PRESENT' : '❌ MISSING'}`);
    console.log(`  - Budget: ${program.budgetAmount ? 'PRESENT' : '❌ MISSING'}`);
    console.log('\nRECOMMENDATION:');
    console.log('  Filter out announcements missing ALL of: applicationStart, deadline, AND budgetAmount');
    console.log('  These are typically umbrella announcements that reference external websites');
  }

  if (bioAdvanced) {
    const program = bioAdvanced.funding_programs;
    console.log('\n🚨 ISSUE 2: 2026년도 바이오접합체 기술선도형 플랫폼 구축 신규과제 공모');
    console.log('----------------------------------------------------------------');
    console.log('PROBLEM: Missing "company with affiliated research institute" requirement');
    console.log('\nELIGIBILITY CRITERIA IN DATABASE:');
    console.log(JSON.stringify(program.eligibilityCriteria, null, 2));
    console.log('\nINNOWAVE PROFILE:');
    console.log(`  - Business Structure: ${innowave.businessStructure} (SOLE_PROPRIETOR - NOT CORPORATION)`);
    console.log(`  - Has Research Institute: Not captured in profile`);
    console.log('\nRECOMMENDATION:');
    console.log('  1. Add "hasResearchInstitute" field to organizations table (if not exists)');
    console.log('  2. Improve eligibility extraction to capture "기업부설연구소" requirement');
    console.log('  3. Add business structure filter when consortium involves research requirements');
  }

  console.log('\n========================================\n');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
