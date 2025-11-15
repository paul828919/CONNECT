import { db } from '../lib/db';
import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';

/**
 * Validation Script: Verify Industry Sector Over-Matching Fix
 *
 * Re-extracts eligibility criteria from existing programs to validate
 * that the regex + section-aware filtering fix resolves the 100% IT bug.
 *
 * Expected Results:
 * - Academic research programs → NO industry tags (was incorrectly "IT")
 * - Biomedical programs → "bio" ONLY (was incorrectly "bio, it")
 * - IT/Broadcasting programs → "it" (correct before and after)
 * - Overall IT rate → ~20-30% (was 100%)
 */

async function validateIndustryFix() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      INDUSTRY SECTOR FIX VALIDATION                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get all programs with extracted text
  const programs = await db.funding_programs.findMany({
    where: {
      extractedText: { not: null },
    },
    select: {
      id: true,
      title: true,
      extractedText: true,
      eligibilityCriteria: true,
    },
  });

  console.log(`📋 Analyzing ${programs.length} programs with extracted text\n`);

  let totalPrograms = 0;
  let withITTag = 0;
  let withBioTag = 0;
  let withDefenseTag = 0;
  let withNoTags = 0;
  let changed = 0;

  const changes: Array<{
    title: string;
    oldSectors: string[];
    newSectors: string[];
  }> = [];

  for (const program of programs) {
    totalPrograms++;

    // Get old sectors from database
    const oldCriteria = program.eligibilityCriteria as any;
    const oldSectors = oldCriteria?.industryRequirements?.sectors || [];

    // Re-extract with new logic
    const newCriteria = extractEligibilityCriteria(program.extractedText!);
    const newSectors = newCriteria?.industryRequirements?.sectors || [];

    // Count new tags
    if (newSectors.includes('it')) withITTag++;
    if (newSectors.includes('bio')) withBioTag++;
    if (newSectors.includes('defense')) withDefenseTag++;
    if (newSectors.length === 0) withNoTags++;

    // Detect changes
    const sectorsChanged =
      oldSectors.length !== newSectors.length ||
      !oldSectors.every((s: string) => newSectors.includes(s));

    if (sectorsChanged) {
      changed++;
      changes.push({
        title: program.title,
        oldSectors,
        newSectors,
      });
    }
  }

  // Show summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY STATISTICS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Programs Analyzed: ${totalPrograms}`);
  console.log(
    `With "IT" Tag: ${withITTag} (${((withITTag / totalPrograms) * 100).toFixed(1)}%)`
  );
  console.log(
    `With "bio" Tag: ${withBioTag} (${((withBioTag / totalPrograms) * 100).toFixed(1)}%)`
  );
  console.log(
    `With "defense" Tag: ${withDefenseTag} (${((withDefenseTag / totalPrograms) * 100).toFixed(1)}%)`
  );
  console.log(
    `With NO Tags: ${withNoTags} (${((withNoTags / totalPrograms) * 100).toFixed(1)}%)`
  );
  console.log(`\nChanges Detected: ${changed}/${totalPrograms} (${((changed / totalPrograms) * 100).toFixed(1)}%)\n`);

  // Show sample changes
  if (changes.length > 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    SAMPLE CHANGES                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    changes.slice(0, 10).forEach((change, idx) => {
      console.log(`${idx + 1}. ${change.title.substring(0, 60)}...`);
      console.log(`   OLD: [${change.oldSectors.join(', ') || 'NONE'}]`);
      console.log(`   NEW: [${change.newSectors.join(', ') || 'NONE'}]`);

      // Analyze if change is correct
      const isBioRelated = /바이오|생명|의료|헬스|제약|진단/i.test(change.title);
      const isITRelated = /정보통신|ICT|IT|소프트웨어|SW|AI|디지털/i.test(
        change.title
      );
      const isAcademicResearch = /학술|연구지원|기초연구/i.test(change.title);

      if (
        isAcademicResearch &&
        change.oldSectors.includes('it') &&
        !change.newSectors.includes('it')
      ) {
        console.log('   ✅ FIX: Removed incorrect IT tag from academic research');
      } else if (
        isBioRelated &&
        !isITRelated &&
        change.oldSectors.includes('it') &&
        !change.newSectors.includes('it')
      ) {
        console.log('   ✅ FIX: Removed incorrect IT tag from pure bio program');
      } else if (
        !isITRelated &&
        change.oldSectors.includes('it') &&
        !change.newSectors.includes('it')
      ) {
        console.log('   ✅ FIX: Removed incorrect IT tag');
      } else {
        console.log('   ℹ️  Other change');
      }

      console.log();
    });

    if (changes.length > 10) {
      console.log(`... and ${changes.length - 10} more changes\n`);
    }
  }

  // Validation checks
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    VALIDATION RESULTS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const itRateAcceptable = withITTag / totalPrograms < 0.5; // Should be under 50%
  const changesDetected = changed > 0; // Should have some changes
  const hasNoTagPrograms = withNoTags > 0; // Should have some programs with no tags

  console.log(`IT Rate < 50%: ${itRateAcceptable ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Changes Detected: ${changesDetected ? '✅ PASS' : '❌ FAIL'}`);
  console.log(
    `Programs with NO Tags: ${hasNoTagPrograms ? '✅ PASS' : '❌ FAIL'}`
  );

  console.log();

  if (itRateAcceptable && changesDetected && hasNoTagPrograms) {
    console.log('🎉 VALIDATION PASSED: Industry sector over-matching is FIXED!');
    console.log(
      `   - IT rate reduced from 100% to ${((withITTag / totalPrograms) * 100).toFixed(1)}%`
    );
    console.log(`   - ${changed} programs corrected`);
    console.log(`   - ${withNoTags} programs now correctly have NO industry tags`);
  } else {
    console.log('⚠️  VALIDATION FAILED: Review extraction logic');
  }

  await db.$disconnect();
}

validateIndustryFix().catch(console.error);
