/**
 * Queue 5 Jobs with HWP Attachments for Processing
 *
 * Purpose: Test pyhwp extraction pipeline with small batch
 * This script:
 * 1. Finds SCRAPED jobs with HWP attachments
 * 2. Marks 5 of them as QUEUED for processing
 * 3. Reports details of queued jobs
 */

import { db } from '../lib/db';

async function queue5JobsForTest() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Queuing 5 Jobs with HWP Attachments for Testing');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Find SCRAPED jobs with HWP attachments ready for processing
    // processingStatus defaults to PENDING for all SCRAPED jobs
    console.log('📊 Searching for jobs with HWP attachments ready for processing...');

    const scrapedJobs = await db.scraping_jobs.findMany({
      where: {
        scrapingStatus: 'SCRAPED',
        attachmentFilenames: {
          isEmpty: false,
        },
        processingStatus: {
          in: ['PENDING', 'FAILED'], // PENDING (not started) or FAILED (can retry)
        },
      },
      take: 50, // Get more to filter for HWP
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`   Found ${scrapedJobs.length} SCRAPED jobs with attachments`);

    // Filter for jobs with HWP files
    const jobsWithHwp = scrapedJobs.filter((job) =>
      job.attachmentFilenames.some((filename) => filename.endsWith('.hwp'))
    );

    console.log(`   Found ${jobsWithHwp.length} jobs with HWP files`);
    console.log('');

    if (jobsWithHwp.length === 0) {
      console.log('❌ No jobs with HWP files found. Cannot proceed with test.');
      console.log('   Please run NTIS scraper first.');
      console.log('');
      return;
    }

    // Select first 5 jobs
    const jobsToQueue = jobsWithHwp.slice(0, 5);

    console.log(`🎯 Queueing ${jobsToQueue.length} jobs for processing:`);
    console.log('');

    // Update jobs to QUEUED status
    for (let i = 0; i < jobsToQueue.length; i++) {
      const job = jobsToQueue[i];
      const hwpFiles = job.attachmentFilenames.filter((f) => f.endsWith('.hwp'));

      await db.scraping_jobs.update({
        where: { id: job.id },
        data: { processingStatus: 'PENDING' },
      });

      console.log(`${i + 1}. ${job.announcementTitle}`);
      console.log(`   ID: ${job.id}`);
      console.log(`   HWP Files: ${hwpFiles.length}`);
      console.log(`   Total Attachments: ${job.attachmentFilenames.length}`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SUCCESS: 5 jobs queued for processing');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Next step: Run process worker to extract and store data');
    console.log('Command: npx tsx scripts/scrape-ntis-processor.ts');
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('❌ Error queuing jobs:', error.message);
    console.error('');
    throw error;
  }
}

queue5JobsForTest()
  .then(() => {
    console.log('Job queuing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Job queuing failed:', error);
    process.exit(1);
  });
