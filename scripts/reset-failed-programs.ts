/**
 * Reset Failed Programs - Clear and Reprocess
 *
 * Purpose: Delete programs where description is null and reset their jobs to PENDING
 * so they can be reprocessed with the fixed processor code.
 */
import { db } from '../lib/db';

async function main() {
  console.log('🔄 Resetting failed programs for reprocessing...\n');

  // Find programs with null descriptions
  const programsToDelete = await db.funding_programs.findMany({
    where: {
      description: null,
      scrapingSource: 'ntis'
    },
    select: {
      id: true,
      title: true
    }
  });

  console.log(`Found ${programsToDelete.length} programs with null descriptions:`);
  programsToDelete.forEach(p => {
    console.log(`  • ${p.title.substring(0, 60)}...`);
  });
  console.log();

  // Delete programs
  const deleteResult = await db.funding_programs.deleteMany({
    where: {
      description: null,
      scrapingSource: 'ntis'
    }
  });

  console.log(`✓ Deleted ${deleteResult.count} programs with null descriptions\n`);

  // Reset their scraping_jobs to PENDING
  const jobsReset = await db.scraping_jobs.updateMany({
    where: {
      processingStatus: 'COMPLETED',
      fundingProgram: null  // No associated program
    },
    data: {
      processingStatus: 'PENDING',
      processingWorker: null,
      processedAt: null,
      fundingProgramId: null
    }
  });

  console.log(`✓ Reset ${jobsReset.count} scraping jobs to PENDING\n`);

  console.log('✅ Ready to reprocess with fixed code!');
  console.log('   Run: DATABASE_URL="..." npx tsx scripts/scrape-ntis-processor.ts');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
