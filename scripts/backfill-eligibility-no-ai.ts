/**
 * Phase 6: Eligibility Data Backfill Script (NO AI)
 *
 * Purpose: Re-extract eligibility criteria from existing programs and populate structured fields
 *
 * What it does:
 * 1. Fetches all programs with eligibilityCriteria JSON
 * 2. Extracts structured data from the JSON into dedicated columns:
 *    - requiredCertifications (text[])
 *    - preferredCertifications (text[])
 *    - requiredInvestmentAmount (numeric)
 *    - requiredOperatingYears (integer)
 *    - maxOperatingYears (integer)
 *    - requiredMinEmployees (integer)
 *    - requiredMaxEmployees (integer)
 *    - requiredMinRevenue (bigint)
 *    - requiredMaxRevenue (bigint)
 * 3. Sets eligibilityConfidence based on data quality
 * 4. Flags ambiguous cases for manual review (manualReviewRequired=true)
 * 5. Updates all records in batch
 *
 * Zero AI Cost: Pure TypeScript logic extracting from existing eligibilityCriteria JSON
 *
 * Run: npx tsx scripts/backfill-eligibility-no-ai.ts
 */

import { PrismaClient, ConfidenceLevel } from '@prisma/client';

const db = new PrismaClient({
  log: ['error'],
});

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
    investmentThreshold?: {
      minimumAmount?: number;
      description?: string;
    };
  };
  certificationRequirements?: {
    required?: string[];
    documents?: string[];
  };
  geographicRequirements?: {
    regions?: string[];
    restrictions?: string;
  };
  industryRequirements?: {
    sectors?: string[];
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
  researchInstituteFocus?: boolean;
  smeEligible?: boolean;
  consortiumRequired?: boolean;
  commercializationFocus?: boolean;
}

interface ExtractionResult {
  programId: string;
  programTitle: string;
  requiredCertifications: string[];
  preferredCertifications: string[];
  requiredInvestmentAmount: number | null;
  requiredOperatingYears: number | null;
  maxOperatingYears: number | null;
  requiredMinEmployees: number | null;
  requiredMaxEmployees: number | null;
  requiredMinRevenue: bigint | null;
  requiredMaxRevenue: bigint | null;
  eligibilityConfidence: ConfidenceLevel;
  manualReviewRequired: boolean;
  manualReviewReason?: string;
}

/**
 * Determine confidence level based on extracted data quality
 *
 * HIGH: Multiple structured fields extracted with clear values
 * MEDIUM: Some structured fields extracted, or single field with clear value
 * LOW: No structured fields extracted, or ambiguous data
 */
function determineConfidence(result: ExtractionResult): ConfidenceLevel {
  let structuredFieldCount = 0;

  if (result.requiredCertifications.length > 0) structuredFieldCount++;
  if (result.preferredCertifications.length > 0) structuredFieldCount++;
  if (result.requiredInvestmentAmount !== null) structuredFieldCount++;
  if (result.requiredOperatingYears !== null || result.maxOperatingYears !== null)
    structuredFieldCount++;

  // HIGH: 3+ structured fields extracted
  if (structuredFieldCount >= 3) {
    return 'HIGH';
  }

  // MEDIUM: 1-2 structured fields extracted
  if (structuredFieldCount >= 1) {
    return 'MEDIUM';
  }

  // LOW: No structured fields extracted
  return 'LOW';
}

/**
 * Extract structured eligibility data from eligibilityCriteria JSON
 *
 * Maps the unstructured JSON to specific database columns for fast SQL queries
 */
function extractStructuredData(
  programId: string,
  programTitle: string,
  criteriaJson: any
): ExtractionResult {
  const result: ExtractionResult = {
    programId,
    programTitle,
    requiredCertifications: [],
    preferredCertifications: [],
    requiredInvestmentAmount: null,
    requiredOperatingYears: null,
    maxOperatingYears: null,
    requiredMinEmployees: null,
    requiredMaxEmployees: null,
    requiredMinRevenue: null,
    requiredMaxRevenue: null,
    eligibilityConfidence: 'LOW',
    manualReviewRequired: false,
  };

  if (!criteriaJson || typeof criteriaJson !== 'object') {
    return result;
  }

  const criteria: EligibilityCriteria = criteriaJson;

  // ══════════════════════════════════════════════════════════════════
  // 1. Extract Certifications
  // ══════════════════════════════════════════════════════════════════
  if (criteria.certificationRequirements?.required) {
    result.requiredCertifications = criteria.certificationRequirements.required;
  }

  // Note: preferredCertifications not in current schema, but we'll prepare the logic
  // for when it's added (currently only requiredCertifications exists)

  // ══════════════════════════════════════════════════════════════════
  // 2. Extract Investment Threshold
  // ══════════════════════════════════════════════════════════════════
  if (criteria.financialRequirements?.investmentThreshold?.minimumAmount) {
    result.requiredInvestmentAmount =
      criteria.financialRequirements.investmentThreshold.minimumAmount;
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. Extract Operating Years
  // ══════════════════════════════════════════════════════════════════
  if (criteria.organizationRequirements?.operatingYears) {
    const opYears = criteria.organizationRequirements.operatingYears;

    if (opYears.minimum !== undefined && opYears.minimum !== null) {
      result.requiredOperatingYears = opYears.minimum;
    }

    if (opYears.maximum !== undefined && opYears.maximum !== null) {
      result.maxOperatingYears = opYears.maximum;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. Determine Confidence and Manual Review Need
  // ══════════════════════════════════════════════════════════════════

  result.eligibilityConfidence = determineConfidence(result);

  // Flag for manual review if:
  // - LOW confidence AND program has some eligibility criteria (ambiguous extraction)
  // - Investment threshold exists but is unusually high (>10억 = suspicious extraction error)
  // - Operating years constraints are contradictory (min > max)

  const hasAmbiguousData =
    result.eligibilityConfidence === 'LOW' &&
    (criteria.certificationRequirements ||
      criteria.financialRequirements ||
      criteria.organizationRequirements);

  const hasUnusualInvestment =
    result.requiredInvestmentAmount !== null && result.requiredInvestmentAmount > 1000000000; // >1B won

  const hasContradictoryYears =
    result.requiredOperatingYears !== null &&
    result.maxOperatingYears !== null &&
    result.requiredOperatingYears > result.maxOperatingYears;

  if (hasAmbiguousData) {
    result.manualReviewRequired = true;
    result.manualReviewReason = 'Low confidence extraction with complex eligibility criteria';
  } else if (hasUnusualInvestment) {
    result.manualReviewRequired = true;
    result.manualReviewReason = `Unusually high investment requirement (${result.requiredInvestmentAmount} won) - verify extraction accuracy`;
  } else if (hasContradictoryYears) {
    result.manualReviewRequired = true;
    result.manualReviewReason = `Contradictory operating years (min: ${result.requiredOperatingYears}, max: ${result.maxOperatingYears})`;
  }

  return result;
}

/**
 * Main backfill function
 */
async function backfillEligibilityData() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  Phase 6: Eligibility Data Backfill (NO AI)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // ══════════════════════════════════════════════════════════════════
    // Step 1: Fetch all programs with eligibilityCriteria
    // ══════════════════════════════════════════════════════════════════
    console.log('📥 Fetching programs with eligibilityCriteria...');

    const programs = await db.funding_programs.findMany({
      where: {
        eligibilityCriteria: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        eligibilityCriteria: true,
      },
    });

    console.log(`   Found ${programs.length} programs with eligibilityCriteria JSON\n`);

    if (programs.length === 0) {
      console.log('⚠️  No programs to backfill. Exiting.');
      return;
    }

    // ══════════════════════════════════════════════════════════════════
    // Step 2: Extract structured data from each program
    // ══════════════════════════════════════════════════════════════════
    console.log('🔍 Extracting structured eligibility data...\n');

    const results: ExtractionResult[] = [];
    let extractionErrors = 0;

    for (const program of programs) {
      try {
        const result = extractStructuredData(
          program.id,
          program.title,
          program.eligibilityCriteria
        );
        results.push(result);
      } catch (error: any) {
        console.error(`   ❌ Extraction error for program ${program.id}: ${error.message}`);
        extractionErrors++;
      }
    }

    console.log(`   ✅ Successfully extracted data from ${results.length} programs`);
    if (extractionErrors > 0) {
      console.log(`   ⚠️  ${extractionErrors} extraction errors (skipped)`);
    }
    console.log('');

    // ══════════════════════════════════════════════════════════════════
    // Step 3: Analyze extraction statistics
    // ══════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXTRACTION STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    const withCerts = results.filter((r) => r.requiredCertifications.length > 0).length;
    const withInvestment = results.filter((r) => r.requiredInvestmentAmount !== null).length;
    const withOperatingYears = results.filter(
      (r) => r.requiredOperatingYears !== null || r.maxOperatingYears !== null
    ).length;

    const highConfidence = results.filter((r) => r.eligibilityConfidence === 'HIGH').length;
    const mediumConfidence = results.filter((r) => r.eligibilityConfidence === 'MEDIUM').length;
    const lowConfidence = results.filter((r) => r.eligibilityConfidence === 'LOW').length;

    const needsReview = results.filter((r) => r.manualReviewRequired).length;

    console.log(`Total Programs Processed:          ${results.length}`);
    console.log('');
    console.log('Structured Fields Extracted:');
    console.log(`  - Required Certifications:       ${withCerts} (${((withCerts / results.length) * 100).toFixed(1)}%)`);
    console.log(
      `  - Investment Threshold:          ${withInvestment} (${((withInvestment / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `  - Operating Years Constraints:   ${withOperatingYears} (${((withOperatingYears / results.length) * 100).toFixed(1)}%)`
    );
    console.log('');
    console.log('Confidence Distribution:');
    console.log(
      `  - HIGH Confidence:               ${highConfidence} (${((highConfidence / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `  - MEDIUM Confidence:             ${mediumConfidence} (${((mediumConfidence / results.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `  - LOW Confidence:                ${lowConfidence} (${((lowConfidence / results.length) * 100).toFixed(1)}%)`
    );
    console.log('');
    console.log(
      `Flagged for Manual Review:         ${needsReview} (${((needsReview / results.length) * 100).toFixed(1)}%)`
    );
    console.log('');

    // ══════════════════════════════════════════════════════════════════
    // Step 4: Update database with extracted data
    // ══════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💾 UPDATING DATABASE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    let updateCount = 0;
    let updateErrors = 0;

    for (const result of results) {
      try {
        await db.funding_programs.update({
          where: { id: result.programId },
          data: {
            requiredCertifications: result.requiredCertifications,
            preferredCertifications: result.preferredCertifications, // Prepare for future schema addition
            requiredInvestmentAmount: result.requiredInvestmentAmount,
            requiredOperatingYears: result.requiredOperatingYears,
            maxOperatingYears: result.maxOperatingYears,
            requiredMinEmployees: result.requiredMinEmployees,
            requiredMaxEmployees: result.requiredMaxEmployees,
            requiredMinRevenue: result.requiredMinRevenue,
            requiredMaxRevenue: result.requiredMaxRevenue,
            eligibilityConfidence: result.eligibilityConfidence,
            manualReviewRequired: result.manualReviewRequired,
            manualReviewNotes: result.manualReviewReason || null,
            eligibilityLastUpdated: new Date(),
          },
        });

        updateCount++;

        // Progress indicator every 50 updates
        if (updateCount % 50 === 0) {
          console.log(`   ✓ Updated ${updateCount}/${results.length} programs...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Update error for ${result.programId}: ${error.message}`);
        updateErrors++;
      }
    }

    console.log('');
    console.log(`   ✅ Successfully updated ${updateCount} programs`);
    if (updateErrors > 0) {
      console.log(`   ⚠️  ${updateErrors} update errors`);
    }
    console.log('');

    // ══════════════════════════════════════════════════════════════════
    // Step 5: Summary
    // ══════════════════════════════════════════════════════════════════
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ BACKFILL COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`📝 Summary:`);
    console.log(`   - Total Programs: ${programs.length}`);
    console.log(`   - Successfully Updated: ${updateCount}`);
    console.log(`   - Extraction Errors: ${extractionErrors}`);
    console.log(`   - Update Errors: ${updateErrors}`);
    console.log(`   - Flagged for Manual Review: ${needsReview}`);
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Verify results: npx tsx scripts/verify-eligibility-extraction.ts');
    console.log(
      `   2. Review flagged programs: Visit /admin/eligibility-review (${needsReview} programs)`
    );
    console.log('   3. Test matching algorithm with new structured fields');
    console.log('   4. Monitor match quality improvements');
    console.log('');
    console.log('🎉 Phase 6 Complete! Zero AI cost.');
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('❌ BACKFILL FAILED');
    console.error('');
    console.error(`Error: ${error.message}`);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run backfill
backfillEligibilityData()
  .then(() => {
    console.log('Backfill process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill process failed:', error);
    process.exit(1);
  });
