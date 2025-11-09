import { db } from '@/lib/db';

async function main() {
  const records = await db.eligibility_verification.findMany({
    take: 5,
    orderBy: { extractionRun: 'desc' },
    include: {
      funding_program: {
        select: { title: true },
      },
    },
  });

  console.log(`Found ${records.length} verification records:\n`);

  records.forEach((record, idx) => {
    console.log(`${idx + 1}. Program: ${record.funding_program.title.substring(0, 60)}...`);
    console.log(`   Confidence: ${record.confidence}`);
    console.log(`   Method: ${record.extractionMethod}`);
    console.log(`   Required certs: [${record.requiredCertifications.join(', ')}]`);
    console.log(`   Preferred certs: [${record.preferredCertifications.join(', ')}]`);
    console.log(`   Matches current: ${record.matchesCurrentData}`);
    console.log(`   Improvement detected: ${record.improvementDetected}`);
    console.log('');
  });

  await db.$disconnect();
}

main();
