import { db } from '../lib/db';

async function investigateTwoBillion() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     INVESTIGATION: ₩2 BILLION INVESTMENT PROGRAMS          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get ALL programs with 2B investment
  const twoBPrograms = await db.funding_programs.findMany({
    where: { requiredInvestmentAmount: 2000000000 },
    select: {
      title: true,
      announcingAgency: true,
      requiredCertifications: true,
    },
    orderBy: { title: 'asc' },
  });

  console.log('📊 All 34 Programs with ₩2,000,000,000 Investment:\n');

  const dcpPrograms = twoBPrograms.filter((p) => p.title.includes('DCP'));
  const nonDcpPrograms = twoBPrograms.filter((p) => !p.title.includes('DCP'));

  console.log('🎯 DCP Programs:', dcpPrograms.length);
  dcpPrograms.slice(0, 5).forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.title.substring(0, 60)}...`);
  });
  if (dcpPrograms.length > 5) {
    console.log(`   ... and ${dcpPrograms.length - 5} more DCP programs`);
  }
  console.log();

  console.log('⚠️  NON-DCP Programs with ₩2B Investment:', nonDcpPrograms.length);
  if (nonDcpPrograms.length > 0) {
    console.log('   🚨 THIS IS THE BUG! Non-DCP programs should NOT have this investment amount:\n');
    nonDcpPrograms.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.title.substring(0, 70)}...`);
      console.log(`      Agency: ${p.announcingAgency}`);
      console.log(`      Certs: [${p.requiredCertifications.join(', ')}]`);
      console.log();
    });
  } else {
    console.log('   ✅ Good! All ₩2B investments are from legitimate DCP programs\n');
  }

  // Check a few programs WITHOUT investment
  console.log('📋 Sample Programs WITHOUT Investment (5 examples):\n');
  const noInvestment = await db.funding_programs.findMany({
    where: { requiredInvestmentAmount: null },
    select: {
      title: true,
      announcingAgency: true,
      requiredCertifications: true,
    },
    take: 5,
  });

  noInvestment.forEach((p, idx) => {
    console.log(`   ${idx + 1}. ${p.title.substring(0, 70)}...`);
    console.log(`      Agency: ${p.announcingAgency || 'Unknown'}`);
    console.log(`      Certs: [${p.requiredCertifications.join(', ')}]`);
    console.log();
  });

  await db.$disconnect();
}

investigateTwoBillion().catch(console.error);
