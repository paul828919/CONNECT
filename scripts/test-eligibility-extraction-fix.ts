/**
 * Test Eligibility Field Extraction Fix
 *
 * Verifies that the extractEligibilityFields function correctly extracts
 * eligibility data from JSONB to top-level fields for matching algorithm.
 *
 * Usage: npx tsx scripts/test-eligibility-extraction-fix.ts
 */

// Mock function copied from worker.ts
function extractEligibilityFields(eligibilityCriteria: any) {
  const fields = {
    requiredInvestmentAmount: null as number | null,
    requiredOperatingYears: null as number | null,
    maxOperatingYears: null as number | null,
    requiredMinEmployees: null as number | null,
    requiredMaxEmployees: null as number | null,
    requiredCertifications: null as string[] | null,
    preferredCertifications: null as string[] | null,
  };

  if (!eligibilityCriteria) {
    return fields;
  }

  try {
    // Extract investment threshold from financialRequirements
    const financialReqs = eligibilityCriteria.financialRequirements;
    if (financialReqs?.investmentThreshold?.minimumAmount) {
      fields.requiredInvestmentAmount = financialReqs.investmentThreshold.minimumAmount;
    }

    // Extract operating years from organizationRequirements
    const orgReqs = eligibilityCriteria.organizationRequirements;
    if (orgReqs?.operatingYears) {
      if (orgReqs.operatingYears.minimum) {
        fields.requiredOperatingYears = orgReqs.operatingYears.minimum;
      }
      if (orgReqs.operatingYears.maximum) {
        fields.maxOperatingYears = orgReqs.operatingYears.maximum;
      }
    }

    // Extract certifications from certificationRequirements
    const certReqs = eligibilityCriteria.certificationRequirements;
    if (certReqs?.required && Array.isArray(certReqs.required) && certReqs.required.length > 0) {
      fields.requiredCertifications = certReqs.required;
    }
    if (certReqs?.preferred && Array.isArray(certReqs.preferred) && certReqs.preferred.length > 0) {
      fields.preferredCertifications = certReqs.preferred;
    }
  } catch (error) {
    console.error('[WORKER] Failed to extract eligibility fields from JSONB:', error);
  }

  return fields;
}

// Test Cases
console.log('Testing Eligibility Field Extraction\n' + '='.repeat(60) + '\n');

// Test 1: DCP-like program with investment requirement
console.log('Test 1: DCP Program (Investment + Operating Years + Certifications)');
const dcpEligibility = {
  financialRequirements: {
    investmentThreshold: {
      minimumAmount: 2000000000, // 20억원
      description: '투자 유치 20억원 이상',
    },
  },
  organizationRequirements: {
    operatingYears: {
      maximum: 7, // 창업 7년 이내
    },
  },
  certificationRequirements: {
    required: ['벤처기업 확인서', 'INNO-BIZ'],
    preferred: ['메인비즈 확인서'],
  },
};

const dcpResult = extractEligibilityFields(dcpEligibility);
console.log('Input:', JSON.stringify(dcpEligibility, null, 2));
console.log('\nExtracted Fields:');
console.log('  requiredInvestmentAmount:', dcpResult.requiredInvestmentAmount, '(₩2B)');
console.log('  maxOperatingYears:', dcpResult.maxOperatingYears, '(7 years)');
console.log('  requiredCertifications:', dcpResult.requiredCertifications);
console.log('  preferredCertifications:', dcpResult.preferredCertifications);

const dcpPass =
  dcpResult.requiredInvestmentAmount === 2000000000 &&
  dcpResult.maxOperatingYears === 7 &&
  dcpResult.requiredCertifications?.length === 2 &&
  dcpResult.preferredCertifications?.length === 1;
console.log('\n  Result:', dcpPass ? '✓ PASS' : '✗ FAIL');
console.log('\n' + '-'.repeat(60) + '\n');

// Test 2: Program with only minimum operating years
console.log('Test 2: Program with Minimum Operating Years');
const operatingYearsEligibility = {
  organizationRequirements: {
    operatingYears: {
      minimum: 3, // 3년 이상
    },
  },
};

const operatingYearsResult = extractEligibilityFields(operatingYearsEligibility);
console.log('Input:', JSON.stringify(operatingYearsEligibility, null, 2));
console.log('\nExtracted Fields:');
console.log('  requiredOperatingYears:', operatingYearsResult.requiredOperatingYears, '(3 years)');
console.log('  maxOperatingYears:', operatingYearsResult.maxOperatingYears, '(null)');

const operatingYearsPass =
  operatingYearsResult.requiredOperatingYears === 3 &&
  operatingYearsResult.maxOperatingYears === null;
console.log('\n  Result:', operatingYearsPass ? '✓ PASS' : '✗ FAIL');
console.log('\n' + '-'.repeat(60) + '\n');

// Test 3: Program with no eligibility criteria (null input)
console.log('Test 3: Program with No Eligibility Criteria');
const nullResult = extractEligibilityFields(null);
console.log('Input: null');
console.log('\nExtracted Fields:');
console.log('  All fields should be null');
console.log('  requiredInvestmentAmount:', nullResult.requiredInvestmentAmount);
console.log('  requiredOperatingYears:', nullResult.requiredOperatingYears);
console.log('  requiredCertifications:', nullResult.requiredCertifications);

const nullPass =
  nullResult.requiredInvestmentAmount === null &&
  nullResult.requiredOperatingYears === null &&
  nullResult.requiredCertifications === null;
console.log('\n  Result:', nullPass ? '✓ PASS' : '✗ FAIL');
console.log('\n' + '-'.repeat(60) + '\n');

// Test 4: Program with empty JSONB object
console.log('Test 4: Program with Empty JSONB Object');
const emptyResult = extractEligibilityFields({});
console.log('Input: {}');
console.log('\nExtracted Fields:');
console.log('  All fields should be null');
console.log('  requiredInvestmentAmount:', emptyResult.requiredInvestmentAmount);

const emptyPass = emptyResult.requiredInvestmentAmount === null;
console.log('\n  Result:', emptyPass ? '✓ PASS' : '✗ FAIL');
console.log('\n' + '='.repeat(60) + '\n');

// Summary
const allPassed = dcpPass && operatingYearsPass && nullPass && emptyPass;
console.log('SUMMARY:');
console.log('  Test 1 (DCP Program):', dcpPass ? '✓' : '✗');
console.log('  Test 2 (Operating Years):', operatingYearsPass ? '✓' : '✗');
console.log('  Test 3 (Null Input):', nullPass ? '✓' : '✗');
console.log('  Test 4 (Empty Object):', emptyPass ? '✓' : '✗');
console.log('\n  Overall:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

if (!allPassed) {
  process.exit(1);
}
