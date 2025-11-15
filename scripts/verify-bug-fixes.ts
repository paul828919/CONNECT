import { db } from '../lib/db';

async function verifyResults() {
  // Statistics
  const totalJobs = await db.scraping_jobs.count();
  const completed = await db.scraping_jobs.count({ where: { processingStatus: 'COMPLETED' } });
  const skipped = await db.scraping_jobs.count({ where: { processingStatus: 'SKIPPED' } });
  const failed = await db.scraping_jobs.count({ where: { processingStatus: 'FAILED' } });
  const pending = await db.scraping_jobs.count({ where: { processingStatus: 'PENDING' } });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           PROCESS WORKER FINAL RESULTS                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log('📊 Job Statistics:');
  console.log('   Total Jobs:', totalJobs);
  console.log('   ✅ Completed:', completed);
  console.log('   ⊘  Skipped:', skipped);
  console.log('   ❌ Failed:', failed);
  console.log('   ⏳ Pending:', pending);
  console.log();

  // BUG #1: Bio-Medical announcement (should be COMPLETED, not SKIPPED)
  const bioMedical = await db.scraping_jobs.findFirst({
    where: {
      announcementTitle: {
        contains: '바이오·의료기술개발',
      },
    },
    select: {
      announcementTitle: true,
      processingStatus: true,
      processingError: true,
      fundingProgramId: true,
    },
  });

  console.log('🧬 BUG #1 VERIFICATION - Bio-Medical Announcement:');
  if (bioMedical) {
    console.log('   Title:', bioMedical.announcementTitle.substring(0, 50) + '...');
    console.log('   Status:', bioMedical.processingStatus);
    console.log('   Error:', bioMedical.processingError || 'None');
    console.log('   Saved to DB:', bioMedical.fundingProgramId ? '✅ YES' : '❌ NO');
    console.log('   🎯 EXPECTED: Status = COMPLETED, Saved = YES');
    const bug1Pass = bioMedical.processingStatus === 'COMPLETED' && bioMedical.fundingProgramId !== null;
    console.log('   🎯 RESULT:', bug1Pass ? '✅ PASS' : '❌ FAIL');
  } else {
    console.log('   ❌ NOT FOUND in database');
  }
  console.log();

  // BUG #2: Broadcasting Policy announcement (should NOT have fabricated criteria)
  const broadcasting = await db.scraping_jobs.findFirst({
    where: {
      announcementTitle: {
        contains: '방송정책',
      },
    },
    select: {
      announcementTitle: true,
      processingStatus: true,
      fundingProgram: {
        select: {
          id: true,
          requiredInvestmentAmount: true,
          eligibilityCriteria: true,
        },
      },
    },
  });

  console.log('📡 BUG #2 VERIFICATION - Broadcasting Policy Announcement:');
  if (broadcasting && broadcasting.fundingProgram) {
    console.log('   Title:', broadcasting.announcementTitle.substring(0, 50) + '...');
    console.log('   Status:', broadcasting.processingStatus);
    console.log('   Investment Amount:', broadcasting.fundingProgram.requiredInvestmentAmount || 'None');

    const criteria = broadcasting.fundingProgram.eligibilityCriteria as any;
    const hasFabricatedInvestment = broadcasting.fundingProgram.requiredInvestmentAmount === 2000000000;
    const hasFabricatedCerts = criteria?.certificationRequirements?.required?.includes('벤처기업') || false;
    const hasFabricatedOrgTypes =
      criteria?.organizationRequirements?.organizationType?.some((t: string) => ['sme', 'venture'].includes(t)) || false;

    console.log('   Has 2B won investment:', hasFabricatedInvestment ? '❌ YES (BUG)' : '✅ NO');
    console.log('   Has 벤처기업 cert:', hasFabricatedCerts ? '❌ YES (BUG)' : '✅ NO');
    console.log('   Has SME/venture type:', hasFabricatedOrgTypes ? '❌ YES (BUG)' : '✅ NO');
    console.log('   🎯 EXPECTED: All three should be NO');
    const bug2Pass = !hasFabricatedInvestment && !hasFabricatedCerts && !hasFabricatedOrgTypes;
    console.log('   🎯 RESULT:', bug2Pass ? '✅ PASS' : '❌ FAIL');
  } else {
    console.log('   ❌ NOT FOUND or not saved to funding_programs');
  }
  console.log();

  // BUG #3: Count all programs with 2 billion won fabricated investment
  const programsWithFabricated = await db.funding_programs.count({
    where: {
      requiredInvestmentAmount: 2000000000,
    },
  });

  const totalPrograms = await db.funding_programs.count();

  console.log('💰 BUG #3 VERIFICATION - Fabricated 2B Won Investment:');
  console.log('   Total Programs:', totalPrograms);
  console.log('   Programs with 2,000,000,000 won:', programsWithFabricated);
  console.log('   🎯 EXPECTED: 0 programs (all fixed)');
  console.log('   🎯 RESULT:', programsWithFabricated === 0 ? '✅ PASS' : '❌ FAIL');
  console.log();

  // Overall summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY:');
  console.log('   • Process Worker completed:', completed, 'jobs');
  console.log('   • Non-R&D announcements skipped:', skipped, 'jobs');
  console.log('   • Total programs saved:', totalPrograms);
  console.log('═══════════════════════════════════════════════════════════');

  await db.$disconnect();
}

verifyResults().catch(console.error);
