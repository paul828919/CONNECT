/**
 * Fix SME Eligibility Data Migration Script (v4.1.1)
 *
 * This script fixes incorrect eligibility requirements for 디딤돌(첫걸음) programs.
 *
 * Problem:
 * - 디딤돌 첫걸음 programs are for very early-stage startups (창업 3년 이내)
 * - AI-extracted eligibility data incorrectly shows:
 *   - requiredCertifications: {VENTURE}
 *   - requiredOperatingYears: 7
 * - These requirements make the programs inaccessible to their target audience
 *
 * Solution:
 * - Clear requiredCertifications for 디딤돌 첫걸음 programs
 * - Set requiredOperatingYears to NULL
 * - This allows proper eligibility checking based on actual program requirements
 *
 * Usage:
 * npx tsx scripts/fix-sme-eligibility-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting SME Eligibility Data Fix (v4.1.1)');
  console.log('=' .repeat(60));

  try {
    // 1. Find all 디딤돌 첫걸음 programs
    const didimPrograms = await prisma.funding_programs.findMany({
      where: {
        ministry: '중소벤처기업부',
        title: { contains: '디딤돌(첫걸음' },
      },
      select: {
        id: true,
        title: true,
        requiredCertifications: true,
        requiredOperatingYears: true,
        status: true,
      },
    });

    console.log(`\n📊 Found ${didimPrograms.length} 디딤돌 첫걸음 programs`);

    // 2. Show current (incorrect) eligibility requirements
    console.log(`\n📋 Current eligibility requirements (to be fixed):`);
    const programsWithRequirements = didimPrograms.filter(
      p => (p.requiredCertifications && p.requiredCertifications.length > 0) || p.requiredOperatingYears
    );
    console.log(`   - Programs with certifications or years requirement: ${programsWithRequirements.length}`);

    programsWithRequirements.slice(0, 5).forEach(p => {
      console.log(`   - [${p.status}] ${p.title.substring(0, 50)}...`);
      console.log(`     Certs: ${JSON.stringify(p.requiredCertifications)}, Years: ${p.requiredOperatingYears}`);
    });
    if (programsWithRequirements.length > 5) {
      console.log(`   ... and ${programsWithRequirements.length - 5} more`);
    }

    // 3. Fix the eligibility data
    console.log(`\n🔄 Clearing incorrect eligibility requirements...`);

    const updateResult = await prisma.funding_programs.updateMany({
      where: {
        ministry: '중소벤처기업부',
        title: { contains: '디딤돌(첫걸음' },
      },
      data: {
        requiredCertifications: [],
        requiredOperatingYears: null,
      },
    });

    console.log(`\n✅ Updated ${updateResult.count} programs`);

    // 4. Verification
    console.log(`\n📊 Post-fix verification:`);

    const fixedPrograms = await prisma.funding_programs.findMany({
      where: {
        ministry: '중소벤처기업부',
        title: { contains: '디딤돌(첫걸음' },
      },
      select: {
        requiredCertifications: true,
        requiredOperatingYears: true,
      },
    });

    const stillHasRequirements = fixedPrograms.filter(
      p => (p.requiredCertifications && p.requiredCertifications.length > 0) || p.requiredOperatingYears
    );

    console.log(`   Programs still with requirements: ${stillHasRequirements.length}`);
    console.log(`   Programs with cleared requirements: ${fixedPrograms.length - stillHasRequirements.length}`);

    console.log(`\n🎉 Eligibility data fix completed!`);
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Regenerate matches for organizations to see updated results`);
    console.log(`   2. Visit /dashboard/matches to verify SME programs appear`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
