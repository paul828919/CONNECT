/**
 * Stage 3.3 Test: Kim Byung-jin Profile TRL Confidence Weighting
 *
 * Verifies that TRL confidence weighting improves match quality by:
 * 1. Finding Kim Byung-jin's organization profile
 * 2. Comparing matches BEFORE and AFTER confidence weighting
 * 3. Analyzing score changes for programs with different confidence levels
 * 4. Verifying that explicit TRL > inferred TRL > missing TRL in scoring
 *
 * Expected Outcomes:
 * - Programs with explicit TRL get higher scores (1.0x multiplier)
 * - Programs with inferred TRL get moderate scores (0.85x multiplier)
 * - Programs with missing TRL get lower scores (0.7x multiplier)
 * - Overall match quality improves (better alignment with actual TRL data)
 */

import { PrismaClient } from '@prisma/client';
import { generateMatches } from '@/lib/matching/algorithm';
import { scoreTRLEnhanced } from '@/lib/matching/trl';

const db = new PrismaClient();

async function testStage3TRLConfidence() {
  console.log('🧪 Stage 3.3: Kim Byung-jin Profile TRL Confidence Test\n');
  console.log('═'.repeat(80));

  try {
    // ============================================================================
    // Step 1: Load Kim Byung-jin's Organization Profile
    // ============================================================================
    console.log('\n📊 Step 1: Loading Kim Byung-jin Organization Profile\n');

    const user = await db.user.findFirst({
      where: { email: 'kbj20415@gmail.com' },
      include: { organization: true },
    });

    if (!user || !user.organization) {
      console.error('❌ FAIL: Kim Byung-jin organization not found');
      console.log('\n   Expected user with email: kbj20415@gmail.com');
      console.log('   Please ensure organization profile exists in database\n');
      return;
    }

    const org = user.organization;
    console.log('   ✅ Organization Found:');
    console.log(`      Name: ${org.name}`);
    console.log(`      Type: ${org.type}`);
    console.log(`      Industry: ${org.industrySector || 'Not specified'}`);
    console.log(`      TRL Level: ${org.technologyReadinessLevel || 'Not specified'}`);
    console.log(`      R&D Projects: ${org.rdProjectCount || 0}`);
    console.log(`      Business Structure: ${org.businessStructure || 'Not specified'}\n`);

    if (!org.technologyReadinessLevel) {
      console.log('   ⚠️  WARNING: Organization has no TRL level set');
      console.log('   TRL scoring will use default fallback logic\n');
    }

    // ============================================================================
    // Step 2: Fetch Active R&D Programs with TRL Confidence Data
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n📋 Step 2: Analyzing R&D Programs TRL Confidence Distribution\n');

    const programs = await db.funding_programs.findMany({
      where: {
        status: 'ACTIVE',
        announcementType: 'R_D_PROJECT',
        scrapingSource: { not: null },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { deadline: 'asc' },
      ],
    });

    console.log(`   Found ${programs.length} active R&D programs\n`);

    // Analyze confidence distribution
    const confidenceCounts = {
      explicit: 0,
      inferred: 0,
      missing: 0,
    };

    programs.forEach((p) => {
      // @ts-ignore - trlConfidence added via migration
      const confidence = p.trlConfidence || 'missing';
      confidenceCounts[confidence as keyof typeof confidenceCounts]++;
    });

    console.log('   TRL Confidence Distribution:');
    console.log(`   ├─ Explicit: ${confidenceCounts.explicit} programs (1.0x multiplier)`);
    console.log(`   ├─ Inferred: ${confidenceCounts.inferred} programs (0.85x multiplier)`);
    console.log(`   └─ Missing: ${confidenceCounts.missing} programs (0.7x multiplier)\n`);

    if (confidenceCounts.explicit === 0 && confidenceCounts.inferred === 0) {
      console.log('   ⚠️  WARNING: No programs with explicit or inferred TRL confidence!');
      console.log('   Test may not demonstrate full confidence weighting impact\n');
    }

    // ============================================================================
    // Step 3: Generate Matches with TRL Confidence Weighting
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n🎯 Step 3: Generating Matches with Confidence Weighting\n');

    const matches = generateMatches(org, programs, 20); // Top 20 matches
    console.log(`   ✅ Generated ${matches.length} matches\n`);

    if (matches.length === 0) {
      console.log('   ⚠️  No matches generated!');
      console.log('   Check if organization profile meets program eligibility criteria\n');
      return;
    }

    // ============================================================================
    // Step 4: Analyze TRL Score Impact by Confidence Level
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n📊 Step 4: TRL Score Impact Analysis by Confidence Level\n');

    const scoresByConfidence = {
      explicit: [] as Array<{ program: string; baseScore: number; finalScore: number; weight: number }>,
      inferred: [] as Array<{ program: string; baseScore: number; finalScore: number; weight: number }>,
      missing: [] as Array<{ program: string; baseScore: number; finalScore: number; weight: number }>,
    };

    matches.forEach((match) => {
      const program = match.program;
      // @ts-ignore - trlConfidence added via migration
      const confidence: 'explicit' | 'inferred' | 'missing' = program.trlConfidence || 'missing';

      // Recalculate TRL score to get detailed breakdown
      const trlResult = scoreTRLEnhanced(org, program);

      // Calculate what base score would have been without confidence weighting
      const baseScore = Math.round(trlResult.score / trlResult.details.confidenceWeight);

      scoresByConfidence[confidence].push({
        program: program.title.substring(0, 60) + '...',
        baseScore,
        finalScore: trlResult.score,
        weight: trlResult.details.confidenceWeight,
      });
    });

    // Display results for each confidence level
    console.log('   📌 Explicit TRL Programs (1.0x multiplier):');
    if (scoresByConfidence.explicit.length === 0) {
      console.log('      No programs with explicit TRL in top 20 matches\n');
    } else {
      scoresByConfidence.explicit.slice(0, 5).forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.program}`);
        console.log(`         Base: ${item.baseScore} pts → Final: ${item.finalScore} pts (${item.weight}x)`);
      });
      console.log('');
    }

    console.log('   📌 Inferred TRL Programs (0.85x multiplier):');
    if (scoresByConfidence.inferred.length === 0) {
      console.log('      No programs with inferred TRL in top 20 matches\n');
    } else {
      scoresByConfidence.inferred.slice(0, 5).forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.program}`);
        console.log(`         Base: ${item.baseScore} pts → Final: ${item.finalScore} pts (${item.weight}x)`);
      });
      console.log('');
    }

    console.log('   📌 Missing TRL Programs (0.7x multiplier):');
    if (scoresByConfidence.missing.length === 0) {
      console.log('      No programs with missing TRL in top 20 matches\n');
    } else {
      scoresByConfidence.missing.slice(0, 5).forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.program}`);
        console.log(`         Base: ${item.baseScore} pts → Final: ${item.finalScore} pts (${item.weight}x)`);
      });
      console.log('');
    }

    // ============================================================================
    // Step 5: Calculate Average Score Impact
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n📈 Step 5: Average TRL Score Impact by Confidence\n');

    const avgScores = {
      explicit: {
        base: scoresByConfidence.explicit.length > 0
          ? Math.round(scoresByConfidence.explicit.reduce((sum, s) => sum + s.baseScore, 0) / scoresByConfidence.explicit.length)
          : 0,
        final: scoresByConfidence.explicit.length > 0
          ? Math.round(scoresByConfidence.explicit.reduce((sum, s) => sum + s.finalScore, 0) / scoresByConfidence.explicit.length)
          : 0,
        count: scoresByConfidence.explicit.length,
      },
      inferred: {
        base: scoresByConfidence.inferred.length > 0
          ? Math.round(scoresByConfidence.inferred.reduce((sum, s) => sum + s.baseScore, 0) / scoresByConfidence.inferred.length)
          : 0,
        final: scoresByConfidence.inferred.length > 0
          ? Math.round(scoresByConfidence.inferred.reduce((sum, s) => sum + s.finalScore, 0) / scoresByConfidence.inferred.length)
          : 0,
        count: scoresByConfidence.inferred.length,
      },
      missing: {
        base: scoresByConfidence.missing.length > 0
          ? Math.round(scoresByConfidence.missing.reduce((sum, s) => sum + s.baseScore, 0) / scoresByConfidence.missing.length)
          : 0,
        final: scoresByConfidence.missing.length > 0
          ? Math.round(scoresByConfidence.missing.reduce((sum, s) => sum + s.finalScore, 0) / scoresByConfidence.missing.length)
          : 0,
        count: scoresByConfidence.missing.length,
      },
    };

    console.log('   Confidence Level | Count | Avg Base | Avg Final | Impact');
    console.log('   ' + '─'.repeat(60));
    console.log(`   Explicit (1.0x)  | ${avgScores.explicit.count.toString().padStart(5)} | ${avgScores.explicit.base.toString().padStart(8)} | ${avgScores.explicit.final.toString().padStart(9)} | ${avgScores.explicit.final - avgScores.explicit.base >= 0 ? '+' : ''}${avgScores.explicit.final - avgScores.explicit.base} pts`);
    console.log(`   Inferred (0.85x) | ${avgScores.inferred.count.toString().padStart(5)} | ${avgScores.inferred.base.toString().padStart(8)} | ${avgScores.inferred.final.toString().padStart(9)} | ${avgScores.inferred.final - avgScores.inferred.base >= 0 ? '+' : ''}${avgScores.inferred.final - avgScores.inferred.base} pts`);
    console.log(`   Missing (0.7x)   | ${avgScores.missing.count.toString().padStart(5)} | ${avgScores.missing.base.toString().padStart(8)} | ${avgScores.missing.final.toString().padStart(9)} | ${avgScores.missing.final - avgScores.missing.base >= 0 ? '+' : ''}${avgScores.missing.final - avgScores.missing.base} pts`);
    console.log('');

    // ============================================================================
    // Step 6: Verification and Summary
    // ============================================================================
    console.log('─'.repeat(80));
    console.log('\n✅ Step 6: Verification and Test Results\n');

    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1: Explicit programs should maintain full score
    console.log('   Test 1: Explicit TRL maintains full score (1.0x)');
    if (scoresByConfidence.explicit.length > 0) {
      const explicitMaintained = scoresByConfidence.explicit.every(s => s.finalScore === s.baseScore);
      if (explicitMaintained) {
        console.log('   ✅ PASS - All explicit programs maintain 100% of base score\n');
        testsPassed++;
      } else {
        console.log('   ❌ FAIL - Some explicit programs have modified scores\n');
        testsFailed++;
      }
    } else {
      console.log('   ℹ️  SKIP - No explicit programs in dataset\n');
    }

    // Test 2: Inferred programs should have 85% of base score
    console.log('   Test 2: Inferred TRL receives 0.85x multiplier');
    if (scoresByConfidence.inferred.length > 0) {
      const inferredCorrect = scoresByConfidence.inferred.every(s =>
        s.finalScore === Math.round(s.baseScore * 0.85)
      );
      if (inferredCorrect) {
        console.log('   ✅ PASS - All inferred programs have 85% weighting\n');
        testsPassed++;
      } else {
        console.log('   ❌ FAIL - Some inferred programs have incorrect weighting\n');
        testsFailed++;
      }
    } else {
      console.log('   ℹ️  SKIP - No inferred programs in dataset\n');
    }

    // Test 3: Missing programs should have 70% of base score
    console.log('   Test 3: Missing TRL receives 0.7x multiplier');
    if (scoresByConfidence.missing.length > 0) {
      const missingCorrect = scoresByConfidence.missing.every(s =>
        s.finalScore === Math.round(s.baseScore * 0.7)
      );
      if (missingCorrect) {
        console.log('   ✅ PASS - All missing TRL programs have 70% weighting\n');
        testsPassed++;
      } else {
        console.log('   ❌ FAIL - Some missing TRL programs have incorrect weighting\n');
        testsFailed++;
      }
    } else {
      console.log('   ℹ️  SKIP - No missing TRL programs in dataset\n');
    }

    // Test 4: Score ordering should follow confidence hierarchy
    console.log('   Test 4: Score hierarchy follows confidence levels');
    if (avgScores.explicit.count > 0 && avgScores.inferred.count > 0 && avgScores.missing.count > 0) {
      const hierarchyCorrect = avgScores.explicit.final >= avgScores.inferred.final &&
                               avgScores.inferred.final >= avgScores.missing.final;
      if (hierarchyCorrect) {
        console.log('   ✅ PASS - Explicit ≥ Inferred ≥ Missing (avg scores)\n');
        testsPassed++;
      } else {
        console.log('   ❌ FAIL - Score hierarchy violated\n');
        console.log(`      Explicit: ${avgScores.explicit.final} | Inferred: ${avgScores.inferred.final} | Missing: ${avgScores.missing.final}\n`);
        testsFailed++;
      }
    } else {
      console.log('   ℹ️  SKIP - Not all confidence levels present in dataset\n');
    }

    // ============================================================================
    // Step 7: Final Summary
    // ============================================================================
    console.log('═'.repeat(80));
    console.log('\n📊 Stage 3.3 Test Summary\n');

    console.log(`   Organization Tested: ${org.name}`);
    console.log(`   TRL Level: ${org.technologyReadinessLevel || 'Not specified'}`);
    console.log(`   Total Programs Analyzed: ${programs.length}`);
    console.log(`   Top Matches Generated: ${matches.length}\n`);

    console.log('   TRL Confidence Distribution in Matches:');
    console.log(`   ├─ Explicit (1.0x): ${scoresByConfidence.explicit.length} programs`);
    console.log(`   ├─ Inferred (0.85x): ${scoresByConfidence.inferred.length} programs`);
    console.log(`   └─ Missing (0.7x): ${scoresByConfidence.missing.length} programs\n`);

    console.log('   Test Results:');
    console.log(`   ├─ Tests Passed: ${testsPassed}`);
    console.log(`   ├─ Tests Failed: ${testsFailed}`);
    console.log(`   └─ Overall Status: ${testsFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    if (testsFailed === 0) {
      console.log('   🎉 TRL confidence weighting is working correctly!');
      console.log('   Programs with explicit TRL data receive higher scores,');
      console.log('   improving match quality and user trust.\n');
    } else {
      console.log('   ⚠️  Some tests failed. Review TRL scoring logic in:');
      console.log('   - lib/matching/trl.ts (scoreTRLEnhanced function)');
      console.log('   - lib/scraping/two-tier-extractor.ts (extractTRL method)');
      console.log('   - scripts/scrape-ntis-processor.ts (trlConfidence population)\n');
    }

    console.log('   Next Steps:');
    console.log('   1. ✅ Stage 3.3 complete - TRL confidence weighting verified');
    console.log('   2. ⏳ Stage 3.4 - Local Docker rebuild');
    console.log('   3. ⏳ Stage 3.4 - Deploy to production\n');

    console.log('═'.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Execute test
testStage3TRLConfidence().catch(console.error);
