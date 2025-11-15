import { db } from '../lib/db';

/**
 * Diagnostic Script: Industry Sector Over-Matching Analysis
 *
 * Purpose: Demonstrate how current industry extraction logic incorrectly tags
 * ALL non-DCP programs as "IT" due to overly permissive keyword matching.
 *
 * Expected Results:
 * - Academic research programs → Should NOT be "IT"
 * - Biomedical programs → Should be "bio" ONLY (not "bio, it")
 * - Broadcasting policy → "IT" is CORRECT
 * - Generic research → Should have NO industry tags
 */

async function diagnoseIndustryOvermatching() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      INDUSTRY SECTOR OVER-MATCHING DIAGNOSTIC              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get sample non-DCP programs with diverse topics
  const programs = await db.funding_programs.findMany({
    where: {
      NOT: { title: { contains: 'DCP', mode: 'insensitive' } },
    },
    select: {
      title: true,
      eligibilityCriteria: true,
    },
    take: 10,
  });

  console.log(`📋 Analyzing ${programs.length} Non-DCP Programs:\n`);

  programs.forEach((prog, idx) => {
    const title = prog.title;
    const criteria = prog.eligibilityCriteria as any;
    const sectors = criteria?.industryRequirements?.sectors || [];

    console.log(`${idx + 1}. ${title.substring(0, 70)}...`);
    console.log(`   Current Tags: [${sectors.join(', ')}]`);

    // Analyze if tagging makes sense
    const isBioRelated = /바이오|생명|의료|헬스|제약|진단/i.test(title);
    const isITRelated = /정보통신|ICT|IT|소프트웨어|SW|AI|디지털/i.test(title);
    const isAcademicResearch = /학술|연구지원|기초연구/i.test(title);
    const isBroadcasting = /방송|통신정책/i.test(title);

    console.log(`   Analysis:`);
    if (isBioRelated && !isITRelated) {
      console.log(`      ✓ Bio-related program`);
      if (sectors.includes('it')) {
        console.log(`      ❌ INCORRECT: Tagged as "IT" despite being pure bio program`);
      }
    }

    if (isAcademicResearch) {
      console.log(`      ✓ Academic research program (no specific industry)`);
      if (sectors.length > 0) {
        console.log(`      ❌ INCORRECT: Tagged as [${sectors.join(', ')}] despite being generic research`);
      }
    }

    if (isBroadcasting) {
      console.log(`      ✓ Broadcasting/ICT policy program`);
      if (sectors.includes('it')) {
        console.log(`      ✅ CORRECT: IT tag is appropriate`);
      }
    }

    if (!isBioRelated && !isITRelated && !isAcademicResearch && !isBroadcasting) {
      console.log(`      ✓ Other domain`);
      if (sectors.includes('it')) {
        console.log(`      ⚠️  SUSPECT: Why is this tagged as IT?`);
      }
    }

    console.log();
  });

  // Summary statistics
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY STATISTICS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const allNonDcp = await db.funding_programs.count({
    where: { NOT: { title: { contains: 'DCP', mode: 'insensitive' } } },
  });

  // Count programs with "IT" in industryRequirements.sectors
  // Note: Prisma JSON queries for nested arrays are complex, so we fetch all and filter
  const allNonDcpPrograms = await db.funding_programs.findMany({
    where: { NOT: { title: { contains: 'DCP', mode: 'insensitive' } } },
    select: { eligibilityCriteria: true },
  });

  const withITTag = allNonDcpPrograms.filter((prog) => {
    const criteria = prog.eligibilityCriteria as any;
    const sectors = criteria?.industryRequirements?.sectors || [];
    return sectors.includes('it');
  }).length;

  const withBioTag = allNonDcpPrograms.filter((prog) => {
    const criteria = prog.eligibilityCriteria as any;
    const sectors = criteria?.industryRequirements?.sectors || [];
    return sectors.includes('bio');
  }).length;

  const withDefenseTag = allNonDcpPrograms.filter((prog) => {
    const criteria = prog.eligibilityCriteria as any;
    const sectors = criteria?.industryRequirements?.sectors || [];
    return sectors.includes('defense');
  }).length;

  const withNoTags = allNonDcpPrograms.filter((prog) => {
    const criteria = prog.eligibilityCriteria as any;
    const sectors = criteria?.industryRequirements?.sectors || [];
    return sectors.length === 0;
  }).length;

  console.log(`Total Non-DCP Programs: ${allNonDcp}`);
  console.log(`With "IT" Tag: ${withITTag} (${((withITTag / allNonDcp) * 100).toFixed(1)}%)`);
  console.log(`With "bio" Tag: ${withBioTag} (${((withBioTag / allNonDcp) * 100).toFixed(1)}%)`);
  console.log(`With "defense" Tag: ${withDefenseTag} (${((withDefenseTag / allNonDcp) * 100).toFixed(1)}%)`);
  console.log(`With NO Tags: ${withNoTags} (${((withNoTags / allNonDcp) * 100).toFixed(1)}%)`);
  console.log();

  if (withITTag > allNonDcp * 0.7) {
    console.log('🚨 CRITICAL BUG CONFIRMED:');
    console.log(`   Over 70% of programs tagged as "IT" suggests over-matching`);
    console.log(`   Expected: ~20-30% for IT-heavy Korean R&D landscape`);
  }

  await db.$disconnect();
}

diagnoseIndustryOvermatching().catch(console.error);
