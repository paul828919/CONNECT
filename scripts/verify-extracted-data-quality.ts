/**
 * Extracted Data Quality Verification Script
 *
 * Purpose: Verify data quality after enhanced eligibility extraction
 * Context: Validate scraping_jobs and funding_programs tables
 *
 * Verification Areas:
 * 1. Scraping Jobs - Status distribution and error analysis
 * 2. Funding Programs - Record count and data completeness
 * 3. Enhanced Eligibility Extraction - Coverage and accuracy
 * 4. Specific Requirements - Organization, Financial, Certification, etc.
 * 5. Data Quality Metrics - Missing fields, validation
 */

import { db } from '../lib/db';

interface EligibilityCriteria {
  organizationRequirements?: {
    operatingYears?: {
      minimum?: number;
      maximum?: number;
      description?: string;
    };
    organizationType?: string[];
  };
  financialRequirements?: {
    rdInvestmentRatio?: {
      minimum?: number;
      period?: string;
      calculationMethod?: string;
    };
  };
  certificationRequirements?: {
    required?: string[];
    documents?: string[];
  };
  consortiumRequirements?: {
    required?: boolean;
    composition?: {
      leadOrganization?: string[];
      participants?: string[];
    };
    type?: string[];
  };
  governmentRelationship?: {
    requiredAgreements?: string[];
    preferredStatus?: string[];
    targetCountry?: string;
  };
  industryRequirements?: {
    sectors?: string[];
  };
  researchInstituteFocus?: boolean;
  smeEligible?: boolean;
  consortiumRequired?: boolean;
  commercializationFocus?: boolean;
}

async function verifyExtractedDataQuality() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Extracted Data Quality Verification');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // Section 1: Scraping Jobs Analysis
    // ═══════════════════════════════════════════════════════════════════════

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SECTION 1: SCRAPING JOBS ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const processingStats = await db.scraping_jobs.groupBy({
      by: ['processingStatus'],
      _count: true,
    });

    console.log('Processing Status Distribution:');
    processingStats.forEach(stat => {
      console.log(`  ${stat.processingStatus}: ${stat._count} jobs`);
    });
    console.log('');

    const totalJobs = await db.scraping_jobs.count();
    const completedJobs = await db.scraping_jobs.count({ where: { processingStatus: 'COMPLETED' } });
    const failedJobs = await db.scraping_jobs.count({ where: { processingStatus: 'FAILED' } });
    const skippedJobs = await db.scraping_jobs.count({ where: { processingStatus: 'SKIPPED' } });

    console.log(`Total Jobs: ${totalJobs}`);
    console.log(`Completed: ${completedJobs} (${((completedJobs / totalJobs) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failedJobs} (${((failedJobs / totalJobs) * 100).toFixed(1)}%)`);
    console.log(`Skipped: ${skippedJobs} (${((skippedJobs / totalJobs) * 100).toFixed(1)}%)`);
    console.log('');

    // Check for failed jobs with error details
    if (failedJobs > 0) {
      console.log('⚠️  Failed Job Details:');
      const failed = await db.scraping_jobs.findMany({
        where: { processingStatus: 'FAILED' },
        select: {
          id: true,
          announcementUrl: true,
          announcementTitle: true,
          processingError: true,
        },
        take: 10,
      });

      failed.forEach(job => {
        console.log(`  Job ${job.id}`);
        console.log(`    Title: ${job.announcementTitle.substring(0, 50)}...`);
        console.log(`    URL: ${job.announcementUrl}`);
        if (job.processingError) {
          console.log(`    Error: ${job.processingError.substring(0, 100)}...`);
        }
      });
      console.log('');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Section 2: Funding Programs Analysis
    // ═══════════════════════════════════════════════════════════════════════

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SECTION 2: FUNDING PROGRAMS ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const totalPrograms = await db.funding_programs.count();
    console.log(`✅ Total Programs: ${totalPrograms}`);
    console.log('');

    // Programs by agency
    const programsByAgency = await db.funding_programs.groupBy({
      by: ['agencyId'],
      _count: true,
    });

    console.log('Programs by Agency:');
    programsByAgency.forEach(stat => {
      console.log(`  ${stat.agencyId}: ${stat._count} programs`);
    });
    console.log('');

    // Data completeness check (only check optional fields)
    const programsWithDescription = await db.funding_programs.count({
      where: {
        description: {
          not: { equals: null }
        }
      },
    });
    const programsWithEligibility = await db.funding_programs.count({
      where: {
        eligibilityCriteria: {
          not: { equals: null }
        }
      },
    });
    const programsWithDeadline = await db.funding_programs.count({
      where: {
        deadline: {
          not: { equals: null }
        }
      },
    });
    const programsWithBudget = await db.funding_programs.count({
      where: {
        budgetAmount: {
          not: { equals: null }
        }
      },
    });

    console.log('Data Completeness (Optional Fields):');
    console.log(`  Title: ${totalPrograms}/${totalPrograms} (100.0%) - Required field`);
    console.log(`  Description: ${programsWithDescription}/${totalPrograms} (${((programsWithDescription / totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`  Eligibility Criteria: ${programsWithEligibility}/${totalPrograms} (${((programsWithEligibility / totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`  Deadline: ${programsWithDeadline}/${totalPrograms} (${((programsWithDeadline / totalPrograms) * 100).toFixed(1)}%)`);
    console.log(`  Budget Amount: ${programsWithBudget}/${totalPrograms} (${((programsWithBudget / totalPrograms) * 100).toFixed(1)}%)`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // Section 3: Enhanced Eligibility Extraction Coverage
    // ═══════════════════════════════════════════════════════════════════════

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SECTION 3: ENHANCED ELIGIBILITY EXTRACTION COVERAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const programsWithEligibilityCriteria = await db.funding_programs.findMany({
      where: { eligibilityCriteria: { not: null } },
      select: {
        id: true,
        title: true,
        agencyId: true,
        eligibilityCriteria: true,
      },
    });

    // Analyze eligibility criteria structure
    let organizationReqCount = 0;
    let financialReqCount = 0;
    let certificationReqCount = 0;
    let consortiumReqCount = 0;
    let governmentRelationshipCount = 0;
    let industryReqCount = 0;
    let legacyFlagCount = 0;

    programsWithEligibilityCriteria.forEach(program => {
      const criteria = program.eligibilityCriteria as EligibilityCriteria;
      if (!criteria) return;

      if (criteria.organizationRequirements) organizationReqCount++;
      if (criteria.financialRequirements) financialReqCount++;
      if (criteria.certificationRequirements) certificationReqCount++;
      if (criteria.consortiumRequirements) consortiumReqCount++;
      if (criteria.governmentRelationship) governmentRelationshipCount++;
      if (criteria.industryRequirements) industryReqCount++;
      if (criteria.smeEligible || criteria.researchInstituteFocus || criteria.consortiumRequired || criteria.commercializationFocus) {
        legacyFlagCount++;
      }
    });

    console.log('Requirement Type Coverage:');
    console.log(`  Organization Requirements: ${organizationReqCount} programs (${((organizationReqCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log(`  Financial Requirements: ${financialReqCount} programs (${((financialReqCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log(`  Certification Requirements: ${certificationReqCount} programs (${((certificationReqCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log(`  Consortium Requirements: ${consortiumReqCount} programs (${((consortiumReqCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log(`  Government Relationship: ${governmentRelationshipCount} programs (${((governmentRelationshipCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log(`  Industry Requirements: ${industryReqCount} programs (${((industryReqCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log(`  Legacy Flags: ${legacyFlagCount} programs (${((legacyFlagCount / programsWithEligibilityCriteria.length) * 100).toFixed(1)}%)`);
    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // Section 4: Specific Requirement Examples
    // ═══════════════════════════════════════════════════════════════════════

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SECTION 4: SPECIFIC REQUIREMENT EXAMPLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // Find programs with operating years requirement
    const programsWithOperatingYears = programsWithEligibilityCriteria.filter(p => {
      const criteria = p.eligibilityCriteria as EligibilityCriteria;
      return criteria?.organizationRequirements?.operatingYears;
    });

    console.log(`\n📌 Programs with Operating Years Requirement: ${programsWithOperatingYears.length}`);
    if (programsWithOperatingYears.length > 0) {
      const sample = programsWithOperatingYears[0];
      const criteria = sample.eligibilityCriteria as EligibilityCriteria;
      console.log(`\nExample: ${sample.title?.substring(0, 50)}...`);
      console.log(`  Operating Years: ${JSON.stringify(criteria.organizationRequirements?.operatingYears, null, 2)}`);
    }

    // Find programs with R&D investment ratio
    const programsWithRDRatio = programsWithEligibilityCriteria.filter(p => {
      const criteria = p.eligibilityCriteria as EligibilityCriteria;
      return criteria?.financialRequirements?.rdInvestmentRatio;
    });

    console.log(`\n📌 Programs with R&D Investment Ratio: ${programsWithRDRatio.length}`);
    if (programsWithRDRatio.length > 0) {
      const sample = programsWithRDRatio[0];
      const criteria = sample.eligibilityCriteria as EligibilityCriteria;
      console.log(`\nExample: ${sample.title?.substring(0, 50)}...`);
      console.log(`  R&D Ratio: ${JSON.stringify(criteria.financialRequirements?.rdInvestmentRatio, null, 2)}`);
    }

    // Find programs with INNO-BIZ certification
    const programsWithINNOBIZ = programsWithEligibilityCriteria.filter(p => {
      const criteria = p.eligibilityCriteria as EligibilityCriteria;
      return criteria?.certificationRequirements?.required?.some(cert =>
        cert.toLowerCase().includes('inno') || cert.includes('이노비즈')
      );
    });

    console.log(`\n📌 Programs with INNO-BIZ Certification: ${programsWithINNOBIZ.length}`);
    if (programsWithINNOBIZ.length > 0) {
      const sample = programsWithINNOBIZ[0];
      const criteria = sample.eligibilityCriteria as EligibilityCriteria;
      console.log(`\nExample: ${sample.title?.substring(0, 50)}...`);
      console.log(`  Certifications: ${JSON.stringify(criteria.certificationRequirements?.required, null, 2)}`);
    }

    // Find programs with consortium requirements
    const programsWithConsortium = programsWithEligibilityCriteria.filter(p => {
      const criteria = p.eligibilityCriteria as EligibilityCriteria;
      return criteria?.consortiumRequirements?.required === true;
    });

    console.log(`\n📌 Programs with Consortium Requirement: ${programsWithConsortium.length}`);
    if (programsWithConsortium.length > 0) {
      const sample = programsWithConsortium[0];
      const criteria = sample.eligibilityCriteria as EligibilityCriteria;
      console.log(`\nExample: ${sample.title?.substring(0, 50)}...`);
      console.log(`  Consortium: ${JSON.stringify(criteria.consortiumRequirements, null, 2)}`);
    }

    // Find programs with MOU/NDA requirements
    const programsWithMOUNDA = programsWithEligibilityCriteria.filter(p => {
      const criteria = p.eligibilityCriteria as EligibilityCriteria;
      return criteria?.governmentRelationship?.requiredAgreements;
    });

    console.log(`\n📌 Programs with MOU/NDA Requirements: ${programsWithMOUNDA.length}`);
    if (programsWithMOUNDA.length > 0) {
      const sample = programsWithMOUNDA[0];
      const criteria = sample.eligibilityCriteria as EligibilityCriteria;
      console.log(`\nExample: ${sample.title?.substring(0, 50)}...`);
      console.log(`  Government Relationship: ${JSON.stringify(criteria.governmentRelationship, null, 2)}`);
    }

    // Find programs with required documents
    const programsWithDocuments = programsWithEligibilityCriteria.filter(p => {
      const criteria = p.eligibilityCriteria as EligibilityCriteria;
      return criteria?.certificationRequirements?.documents && criteria.certificationRequirements.documents.length > 0;
    });

    console.log(`\n📌 Programs with Required Documents: ${programsWithDocuments.length}`);
    if (programsWithDocuments.length > 0) {
      const sample = programsWithDocuments[0];
      const criteria = sample.eligibilityCriteria as EligibilityCriteria;
      console.log(`\nExample: ${sample.title?.substring(0, 50)}...`);
      console.log(`  Documents: ${JSON.stringify(criteria.certificationRequirements?.documents, null, 2)}`);
    }

    console.log('');

    // ═══════════════════════════════════════════════════════════════════════
    // Section 5: Data Quality Summary
    // ═══════════════════════════════════════════════════════════════════════

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SECTION 5: DATA QUALITY SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const qualityScore = {
      dataCompleteness: ((totalPrograms + programsWithDescription + programsWithEligibility + programsWithDeadline + programsWithBudget) / (totalPrograms * 5) * 100),
      successRate: (completedJobs / totalJobs * 100),
      eligibilityExtraction: (programsWithEligibilityCriteria.length / totalPrograms * 100),
    };

    console.log('Quality Metrics:');
    console.log(`  ✅ Data Completeness: ${qualityScore.dataCompleteness.toFixed(1)}%`);
    console.log(`  ✅ Success Rate: ${qualityScore.successRate.toFixed(1)}%`);
    console.log(`  ✅ Eligibility Extraction: ${qualityScore.eligibilityExtraction.toFixed(1)}%`);
    console.log('');

    const overallScore = (qualityScore.dataCompleteness + qualityScore.successRate + qualityScore.eligibilityExtraction) / 3;
    console.log(`Overall Data Quality Score: ${overallScore.toFixed(1)}%`);
    console.log('');

    // Final verdict
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 FINAL VERDICT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (overallScore >= 90) {
      console.log('✅ EXCELLENT DATA QUALITY');
      console.log('');
      console.log('   Enhanced eligibility extraction is working correctly.');
      console.log('   All requirement types are being captured as expected.');
      console.log('   Data completeness and success rates are excellent.');
      console.log('');
      console.log('💡 Recommendation: READY FOR PRODUCTION DEPLOYMENT');
    } else if (overallScore >= 75) {
      console.log('✅ GOOD DATA QUALITY');
      console.log('');
      console.log('   Enhanced eligibility extraction is working well.');
      console.log('   Most requirement types are being captured correctly.');
      console.log('   Minor improvements may be needed.');
      console.log('');
      console.log('💡 Recommendation: ACCEPTABLE FOR PRODUCTION DEPLOYMENT');
    } else {
      console.log('⚠️  DATA QUALITY NEEDS IMPROVEMENT');
      console.log('');
      console.log('   Some issues detected with extraction or data completeness.');
      console.log('   Review failed jobs and missing data before deployment.');
      console.log('');
      console.log('💡 Recommendation: INVESTIGATE ISSUES BEFORE DEPLOYMENT');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('❌ Data quality verification failed:', error.message);
    console.error('');
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.meta) {
      console.error(`   Error Details: ${JSON.stringify(error.meta, null, 2)}`);
    }
    console.error('');
    throw error;
  }
}

// Run verification
verifyExtractedDataQuality()
  .then(() => {
    console.log('Data quality verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Data quality verification failed:', error);
    process.exit(1);
  });
