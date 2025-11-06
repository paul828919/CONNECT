/**
 * End-to-End TRL Flow Test
 * Tests the complete flow: extraction → classification → scoring
 */

import { extractTRLRange } from '@/lib/scraping/utils';
import { classifyTRL } from '@/lib/matching/trl-classifier';
import { scoreTRLEnhanced } from '@/lib/matching/trl';
import { db } from '@/lib/db';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪  END-TO-END TRL FLOW TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Explicit TRL extraction
  console.log('Test 1: Explicit TRL Extraction');
  console.log('─────────────────────────────────────');
  const explicitText = '본 과제는 TRL 4-6 수준의 기술개발을 목표로 합니다.';
  const explicitResult = extractTRLRange(explicitText);
  console.log(`Input: "${explicitText}"`);
  console.log(`Result:`, explicitResult);
  console.log(`✓ Detected: ${explicitResult ? 'YES' : 'NO'}`);
  console.log(`✓ Confidence: ${explicitResult?.confidence || 'N/A'}\n`);

  // Test 2: Implicit TRL extraction
  console.log('Test 2: Implicit TRL Extraction (Korean keywords)');
  console.log('─────────────────────────────────────');
  const implicitText = '실용화 및 사업화 단계의 기술 지원';
  const implicitResult = extractTRLRange(implicitText);
  console.log(`Input: "${implicitText}"`);
  console.log(`Result:`, implicitResult);
  console.log(`✓ Detected: ${implicitResult ? 'YES' : 'NO'}`);
  console.log(`✓ Confidence: ${implicitResult?.confidence || 'N/A'}\n`);

  // Test 3: TRL classification
  console.log('Test 3: TRL Classification');
  console.log('─────────────────────────────────────');
  if (implicitResult) {
    const classification = classifyTRL(implicitResult.minTRL, implicitResult.maxTRL);
    console.log(`TRL Range: ${implicitResult.minTRL}-${implicitResult.maxTRL}`);
    console.log(`Classification:`, JSON.stringify(classification, null, 2));
    console.log(`✓ Stage (Korean): ${classification.stageKorean}`);
    console.log(`✓ Keywords: ${classification.keywords.slice(0, 5).join(', ')}\n`);
  }

  // Test 4: TRL scoring with confidence weighting
  console.log('Test 4: TRL Scoring with Confidence Weighting');
  console.log('─────────────────────────────────────');

  // Get a test organization (assume TRL 7)
  const testOrg = await db.organizations.findFirst({
    where: {
      technologyReadinessLevel: 7,
    },
  });

  // Get one of the reclassified programs (TRL 7-9, inferred)
  const testProgram = await db.funding_programs.findFirst({
    where: {
      trlConfidence: 'inferred',
    },
  });

  if (testOrg && testProgram) {
    console.log(`Organization: ${testOrg.name}`);
    console.log(`Organization TRL: ${testOrg.technologyReadinessLevel}`);
    console.log(`\nProgram: ${testProgram.title}`);
    console.log(`Program TRL Range: ${testProgram.minTrl}-${testProgram.maxTrl}`);
    // @ts-ignore
    console.log(`Program TRL Confidence: ${testProgram.trlConfidence || 'missing'}`);

    const scoreResult = scoreTRLEnhanced(testOrg, testProgram);
    console.log(`\nMatch Result:`);
    console.log(`✓ Score: ${scoreResult.score}/20`);
    console.log(`✓ Reason: ${scoreResult.reason}`);
    console.log(`✓ Confidence: ${scoreResult.details.confidence}`);
    console.log(`✓ Confidence Weight: ${scoreResult.details.confidenceWeight}x`);
    console.log(`✓ Within Range: ${scoreResult.details.isWithinRange ? 'YES' : 'NO'}`);
    console.log(`✓ Difference: ${scoreResult.details.difference} TRL levels\n`);
  } else {
    console.log('⚠️  No suitable test data found\n');
  }

  // Test 5: Missing TRL handling
  console.log('Test 5: Missing TRL Handling');
  console.log('─────────────────────────────────────');
  const noTRLText = '기술 개발 과제입니다.';
  const noTRLResult = extractTRLRange(noTRLText);
  console.log(`Input: "${noTRLText}"`);
  console.log(`Result:`, noTRLResult);
  console.log(`✓ Detected: ${noTRLResult ? 'YES' : 'NO'}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅  END-TO-END TRL FLOW TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');

  await db.$disconnect();
}

main().catch(console.error);
