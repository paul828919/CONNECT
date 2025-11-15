import { db } from '../lib/db';

async function analyzeNonDcpCriteria() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      NON-DCP ELIGIBILITY CRITERIA ANALYSIS                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get non-DCP programs
  const nonDcpPrograms = await db.funding_programs.findMany({
    where: {
      NOT: { title: { contains: 'DCP', mode: 'insensitive' } },
    },
    select: {
      title: true,
      announcingAgency: true,
      requiredCertifications: true,
      requiredMinEmployees: true,
      requiredMaxEmployees: true,
      requiredOperatingYears: true,
      maxOperatingYears: true,
      eligibilityCriteria: true,
    },
    take: 10,
  });

  console.log(`📋 Analyzing ${nonDcpPrograms.length} Non-DCP Programs:\n`);

  nonDcpPrograms.forEach((prog, idx) => {
    console.log(`${idx + 1}. ${prog.title.substring(0, 70)}...`);
    console.log(`   Agency: ${prog.announcingAgency || 'Unknown'}`);

    // Check structured fields
    const hasStructuredData =
      prog.requiredCertifications.length > 0 ||
      prog.requiredMinEmployees !== null ||
      prog.requiredMaxEmployees !== null ||
      prog.requiredOperatingYears !== null ||
      prog.maxOperatingYears !== null;

    console.log(`   Structured Fields: ${hasStructuredData ? '✅ Has Data' : '❌ Empty'}`);
    if (hasStructuredData) {
      console.log(`      Certs: [${prog.requiredCertifications.join(', ')}]`);
      if (prog.requiredMinEmployees || prog.requiredMaxEmployees) {
        console.log(`      Employees: ${prog.requiredMinEmployees || '?'} - ${prog.requiredMaxEmployees || '?'}`);
      }
      if (prog.requiredOperatingYears || prog.maxOperatingYears) {
        console.log(`      Operating Years: ${prog.requiredOperatingYears || '?'} - ${prog.maxOperatingYears || '?'}`);
      }
    }

    // Check eligibilityCriteria JSON
    const criteria = prog.eligibilityCriteria as any;
    if (criteria && typeof criteria === 'object') {
      const keys = Object.keys(criteria);
      console.log(`   JSON Criteria Keys: [${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}]`);

      // Show a sample of the JSON
      const sample = JSON.stringify(criteria, null, 2).substring(0, 200);
      console.log(`   Sample: ${sample}...`);
    } else {
      console.log(`   JSON Criteria: ❌ Empty or null`);
    }
    console.log();
  });

  // Summary statistics
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY STATISTICS                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const allNonDcp = await db.funding_programs.count({
    where: { NOT: { title: { contains: 'DCP', mode: 'insensitive' } } },
  });

  const withCerts = await db.funding_programs.count({
    where: {
      NOT: { title: { contains: 'DCP', mode: 'insensitive' } },
      requiredCertifications: { isEmpty: false },
    },
  });

  const withEmployeeReq = await db.funding_programs.count({
    where: {
      NOT: { title: { contains: 'DCP', mode: 'insensitive' } },
      OR: [{ requiredMinEmployees: { not: null } }, { requiredMaxEmployees: { not: null } }],
    },
  });

  const withOperatingYears = await db.funding_programs.count({
    where: {
      NOT: { title: { contains: 'DCP', mode: 'insensitive' } },
      OR: [{ requiredOperatingYears: { not: null } }, { maxOperatingYears: { not: null } }],
    },
  });

  console.log(`Total Non-DCP Programs: ${allNonDcp}`);
  console.log(`With Certification Requirements: ${withCerts} (${((withCerts / allNonDcp) * 100).toFixed(1)}%)`);
  console.log(`With Employee Requirements: ${withEmployeeReq} (${((withEmployeeReq / allNonDcp) * 100).toFixed(1)}%)`);
  console.log(
    `With Operating Years Requirements: ${withOperatingYears} (${((withOperatingYears / allNonDcp) * 100).toFixed(1)}%)`
  );
  console.log();

  await db.$disconnect();
}

analyzeNonDcpCriteria().catch(console.error);
