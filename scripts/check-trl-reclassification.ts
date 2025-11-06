/**
 * Quick check for TRL reclassification results
 */

import { db } from '@/lib/db';

async function main() {
  const programs = await db.funding_programs.findMany({
    where: {
      trlConfidence: 'inferred'
    },
    select: {
      id: true,
      title: true,
      minTrl: true,
      maxTrl: true,
      trlConfidence: true,
      trlClassification: true,
    }
  });

  console.log('Programs with inferred TRL:', programs.length);
  console.log();

  programs.forEach((p, i) => {
    console.log(`${i + 1}. ${p.title}`);
    console.log(`   TRL Range: ${p.minTrl}-${p.maxTrl}`);
    console.log(`   Confidence: ${p.trlConfidence}`);
    console.log(`   Classification:`, JSON.stringify(p.trlClassification, null, 2));
    console.log();
  });

  await db.$disconnect();
}

main().catch(console.error);
