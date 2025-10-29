#!/usr/bin/env tsx

/**
 * Clear NTIS Test Data
 *
 * Deletes all NTIS programs from the database to prepare for fresh scraping tests.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check current NTIS programs (using correct schema: funding_programs model, agencyId field)
    const ntisPrograms = await prisma.funding_programs.findMany({
      where: { agencyId: 'NTIS' },
      select: {
        id: true,
        title: true,
        budgetAmount: true,
        minTrl: true,
        maxTrl: true,
        allowedBusinessStructures: true,
      },
    });

    console.log('=== Current NTIS Programs ===');
    console.log(`Total NTIS programs: ${ntisPrograms.length}\n`);

    if (ntisPrograms.length > 0) {
      console.log('Sample data (first 3):');
      ntisPrograms.slice(0, 3).forEach((p, i) => {
        console.log(`${i + 1}. ${p.title.substring(0, 60)}...`);
        console.log(`   Budget: ${p.budgetAmount || 'NULL'}`);
        console.log(`   TRL: ${p.minTrl || 'NULL'}-${p.maxTrl || 'NULL'}`);
        console.log(`   Business Structures: ${p.allowedBusinessStructures?.length || 0} values\n`);
      });

      // Calculate NULL rates
      const budgetNulls = ntisPrograms.filter(p => !p.budgetAmount).length;
      const trlNulls = ntisPrograms.filter(p => !p.minTrl && !p.maxTrl).length;
      const bizStructNulls = ntisPrograms.filter(p => !p.allowedBusinessStructures || p.allowedBusinessStructures.length === 0).length;

      console.log(`\n=== Enhancement Field Statistics (BEFORE) ===`);
      console.log(`Budget NULL: ${budgetNulls}/${ntisPrograms.length} (${(budgetNulls/ntisPrograms.length*100).toFixed(1)}%)`);
      console.log(`TRL NULL: ${trlNulls}/${ntisPrograms.length} (${(trlNulls/ntisPrograms.length*100).toFixed(1)}%)`);
      console.log(`Business Structure NULL: ${bizStructNulls}/${ntisPrograms.length} (${(bizStructNulls/ntisPrograms.length*100).toFixed(1)}%)\n`);

      // Delete all NTIS programs
      console.log('Deleting all NTIS programs...');
      const result = await prisma.funding_programs.deleteMany({
        where: { agencyId: 'NTIS' },
      });

      console.log(`✅ Deleted ${result.count} NTIS programs\n`);
      console.log('Database is now ready for fresh scraping test.');
    } else {
      console.log('✅ No NTIS programs found. Database is already clean.\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
