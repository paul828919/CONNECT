/**
 * Check Phase 2 Enhancement Field Coverage
 *
 * Verifies how many NTIS programs have the new enhancement fields populated:
 * 1. allowedBusinessStructures - Business structure requirements
 * 2. attachmentUrls - PDF/HWP attachment file names
 * 3. trlInferred - Whether TRL was auto-classified
 *
 * Goal: Verify Phase 2 enhancements are working in production database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnhancementFieldsCoverage() {
  console.log('🔍 Checking Phase 2 Enhancement Field Coverage\n');
  console.log('='.repeat(80));

  try {
    // Get total NTIS program count
    const totalPrograms = await prisma.funding_programs.count({
      where: { agencyId: 'NTIS' },
    });

    console.log(`\n📊 Total NTIS Programs: ${totalPrograms.toLocaleString()}\n`);
    console.log('─'.repeat(80));

    // Check allowedBusinessStructures coverage
    const withBusinessStructures = await prisma.funding_programs.count({
      where: {
        agencyId: 'NTIS',
        allowedBusinessStructures: { isEmpty: false },
      },
    });

    const businessStructureCoverage = (withBusinessStructures / totalPrograms) * 100;

    console.log('\n1️⃣ Business Structure Requirements (allowedBusinessStructures)');
    console.log('─'.repeat(80));
    console.log(`   Programs with restrictions: ${withBusinessStructures.toLocaleString()}`);
    console.log(`   Programs without restrictions: ${(totalPrograms - withBusinessStructures).toLocaleString()}`);
    console.log(`   Coverage: ${businessStructureCoverage.toFixed(1)}% have restrictions`);
    console.log(
      `   ${businessStructureCoverage >= 10 ? '✅' : '⚠️'} Target: ≥10% (typical restriction rate)`
    );

    // Sample programs with business structure restrictions
    const sampleRestricted = await prisma.funding_programs.findMany({
      where: {
        agencyId: 'NTIS',
        allowedBusinessStructures: { isEmpty: false },
      },
      select: {
        title: true,
        allowedBusinessStructures: true,
      },
      take: 3,
    });

    if (sampleRestricted.length > 0) {
      console.log('\n   📋 Sample programs with restrictions:');
      sampleRestricted.forEach((prog, idx) => {
        const titlePreview = prog.title.substring(0, 60);
        console.log(`      ${idx + 1}. ${titlePreview}...`);
        console.log(`         Allowed: ${prog.allowedBusinessStructures.join(', ')}`);
      });
    }

    // Check attachmentUrls coverage
    const withAttachments = await prisma.funding_programs.count({
      where: {
        agencyId: 'NTIS',
        attachmentUrls: { isEmpty: false },
      },
    });

    const attachmentCoverage = (withAttachments / totalPrograms) * 100;

    console.log('\n\n2️⃣ Attachment URLs (attachmentUrls)');
    console.log('─'.repeat(80));
    console.log(`   Programs with attachments: ${withAttachments.toLocaleString()}`);
    console.log(`   Programs without attachments: ${(totalPrograms - withAttachments).toLocaleString()}`);
    console.log(`   Coverage: ${attachmentCoverage.toFixed(1)}% have attachments`);
    console.log(
      `   ${attachmentCoverage >= 50 ? '✅' : '⚠️'} Target: ≥50% (NTIS typical attachment rate)`
    );

    // Sample programs with attachments
    const sampleWithAttachments = await prisma.funding_programs.findMany({
      where: {
        agencyId: 'NTIS',
        attachmentUrls: { isEmpty: false },
      },
      select: {
        title: true,
        attachmentUrls: true,
      },
      take: 3,
    });

    if (sampleWithAttachments.length > 0) {
      console.log('\n   📋 Sample programs with attachments:');
      sampleWithAttachments.forEach((prog, idx) => {
        const titlePreview = prog.title.substring(0, 60);
        console.log(`      ${idx + 1}. ${titlePreview}...`);
        console.log(`         Attachments: ${prog.attachmentUrls.length} files`);
        console.log(`         └─ ${prog.attachmentUrls.slice(0, 2).join(', ')}`);
      });
    }

    // Check trlInferred coverage
    const withTrlInferred = await prisma.funding_programs.count({
      where: {
        agencyId: 'NTIS',
        trlInferred: true,
      },
    });

    const trlInferredCoverage = (withTrlInferred / totalPrograms) * 100;

    // Programs with explicit TRL (minTrl OR maxTrl not NULL)
    const withExplicitTrl = await prisma.funding_programs.count({
      where: {
        agencyId: 'NTIS',
        OR: [{ minTrl: { not: null } }, { maxTrl: { not: null } }],
      },
    });

    const trlCoverage = (withExplicitTrl / totalPrograms) * 100;

    console.log('\n\n3️⃣ TRL Auto-Classification (trlInferred)');
    console.log('─'.repeat(80));
    console.log(`   Programs with inferred TRL: ${withTrlInferred.toLocaleString()}`);
    console.log(
      `   Programs with explicit TRL: ${(withExplicitTrl - withTrlInferred).toLocaleString()}`
    );
    console.log(`   Programs with no TRL: ${(totalPrograms - withExplicitTrl).toLocaleString()}`);
    console.log(`   Inference rate: ${trlInferredCoverage.toFixed(1)}% auto-classified`);
    console.log(`   Total TRL coverage: ${trlCoverage.toFixed(1)}% (explicit + inferred)`);
    console.log(
      `   ${trlCoverage >= 70 ? '✅' : '⚠️'} Target: ≥70% TRL coverage (Phase 6 success criteria)`
    );

    // Sample programs with inferred TRL
    const sampleInferred = await prisma.funding_programs.findMany({
      where: {
        agencyId: 'NTIS',
        trlInferred: true,
      },
      select: {
        title: true,
        minTrl: true,
        maxTrl: true,
        trlInferred: true,
      },
      take: 3,
    });

    if (sampleInferred.length > 0) {
      console.log('\n   📋 Sample programs with inferred TRL:');
      sampleInferred.forEach((prog, idx) => {
        const titlePreview = prog.title.substring(0, 60);
        const trlRange = `TRL ${prog.minTrl || '?'}-${prog.maxTrl || '?'}`;
        console.log(`      ${idx + 1}. ${titlePreview}...`);
        console.log(`         ${trlRange} (keyword-based inference)`);
      });
    }

    // Overall NULL rate check (Phase 6 success criteria: <20%)
    const withNullBudget = await prisma.funding_programs.count({
      where: { agencyId: 'NTIS', budgetAmount: null },
    });
    const withNullDeadline = await prisma.funding_programs.count({
      where: { agencyId: 'NTIS', deadline: null },
    });

    const budgetNullRate = (withNullBudget / totalPrograms) * 100;
    const deadlineNullRate = (withNullDeadline / totalPrograms) * 100;

    console.log('\n\n4️⃣ NULL Rate Verification (Phase 6 Success Criteria)');
    console.log('─'.repeat(80));
    console.log(`   Budget NULL rate: ${budgetNullRate.toFixed(1)}%`);
    console.log(
      `   ${budgetNullRate < 20 ? '✅' : '❌'} Target: <20% (synonym extraction improvement)`
    );
    console.log(`   Deadline NULL rate: ${deadlineNullRate.toFixed(1)}%`);
    console.log(
      `   ${deadlineNullRate < 20 ? '✅' : '❌'} Target: <20% (synonym extraction improvement)`
    );

    // Summary
    console.log('\n\n📊 Phase 6 Test Results Summary');
    console.log('═'.repeat(80));
    console.log(`Total NTIS Programs: ${totalPrograms.toLocaleString()}`);
    console.log(
      `Business Structure Restrictions: ${businessStructureCoverage.toFixed(1)}% ${businessStructureCoverage >= 10 ? '✅' : '⚠️'}`
    );
    console.log(
      `Attachment URLs: ${attachmentCoverage.toFixed(1)}% ${attachmentCoverage >= 50 ? '✅' : '⚠️'}`
    );
    console.log(`TRL Coverage: ${trlCoverage.toFixed(1)}% ${trlCoverage >= 70 ? '✅' : '⚠️'}`);
    console.log(
      `Budget NULL Rate: ${budgetNullRate.toFixed(1)}% ${budgetNullRate < 20 ? '✅' : '❌'}`
    );
    console.log(
      `Deadline NULL Rate: ${deadlineNullRate.toFixed(1)}% ${deadlineNullRate < 20 ? '✅' : '❌'}`
    );

    console.log('\n');
  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkEnhancementFieldsCoverage().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
