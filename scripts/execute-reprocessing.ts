import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://connect:connect_dev_password@localhost:5432/connect?schema=public',
    },
  },
});

/**
 * Execute re-processing of 244 programs by resetting their scraping job status
 *
 * This script:
 * 1. Reads job IDs from /tmp/failed-text-extraction-job-ids.json
 * 2. Updates scraping_jobs table: status = 'pending'
 * 3. Local Dev Scraper process workers will automatically pick up these jobs
 * 4. Workers will re-download attachments and extract text (pyhwp + Hancom fallback)
 * 5. Budget extraction will run on newly extracted text
 */
async function main() {
  console.log('='.repeat(100));
  console.log('EXECUTING RE-PROCESSING: 244 Programs');
  console.log('='.repeat(100));

  // Load job IDs from file
  const inputPath = '/tmp/failed-text-extraction-job-ids.json';

  if (!fs.existsSync(inputPath)) {
    console.error(`\n❌ File not found: ${inputPath}`);
    console.error('   Please run: npx tsx scripts/reprocess-failed-text-extraction.ts first');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const jobIds: string[] = data.jobIds;

  console.log(`\n📊 Loaded ${jobIds.length} job IDs from file\n`);

  console.log('Starting update...\n');

  // Update all jobs to PENDING status
  const updateResult = await prisma.scraping_jobs.updateMany({
    where: {
      id: { in: jobIds },
    },
    data: {
      processingStatus: 'PENDING',
      processedAt: null, // Clear processedAt so workers treat as new
      processingAttempts: 0, // Reset attempts
      processingError: null, // Clear previous errors
    },
  });

  console.log(`✅ Updated ${updateResult.count} scraping jobs to status="pending"\n`);

  console.log('='.repeat(100));
  console.log('RE-PROCESSING TRIGGERED');
  console.log('='.repeat(100));

  console.log('\nWhat happens next:');
  console.log('1. Local Dev Scraper process workers will detect these pending jobs');
  console.log('2. Workers will re-process each job:');
  console.log('   - Download detail page');
  console.log('   - Download attachments');
  console.log('   - Extract text from attachments (pyhwp → Hancom fallback)');
  console.log('   - Extract budget from text');
  console.log('   - Update funding_programs table');

  console.log('\n📊 Monitoring:');
  console.log('   - Database: Check scraping_jobs.status and detailPageData.attachments[].text');
  console.log('   - Local UI: Visit localhost:3000 to see updated programs');
  console.log('   - Logs: Monitor Dev Scraper container logs for extraction progress');

  console.log('\n📝 To check progress:');
  console.log('   npx tsx scripts/check-reprocessing-progress.ts');

  console.log('\n' + '='.repeat(100));
  console.log('END OF EXECUTION');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
