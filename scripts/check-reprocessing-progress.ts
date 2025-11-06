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
 * Monitor re-processing progress for 244 programs
 *
 * Shows:
 * - How many jobs completed
 * - How many jobs still pending/processing
 * - Text extraction success rate
 * - Budget extraction success rate
 */
async function main() {
  console.log('='.repeat(100));
  console.log('RE-PROCESSING PROGRESS MONITOR');
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

  console.log(`\n📊 Monitoring ${jobIds.length} jobs\n`);

  // Get current status of all jobs
  const jobs = await prisma.scraping_jobs.findMany({
    where: {
      id: { in: jobIds },
    },
    select: {
      id: true,
      processingStatus: true,
      detailPageData: true,
      fundingProgram: {
        select: {
          id: true,
          title: true,
          budgetAmount: true,
        },
      },
    },
  });

  // Count statuses
  const statusCounts: Record<string, number> = {};
  let textExtractionSuccess = 0;
  let budgetExtractionSuccess = 0;

  const completedJobs: Array<{
    title: string;
    hasText: boolean;
    hasBudget: boolean;
    textLength: number;
    attachmentCount: number;
  }> = [];

  for (const job of jobs) {
    const status = job.processingStatus;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (status === 'COMPLETED') {
      const data = job.detailPageData as any;
      const attachments = data?.attachments || [];

      let totalTextLength = 0;
      for (const att of attachments) {
        if (att.text) {
          totalTextLength += att.text.length;
        }
      }

      const hasText = totalTextLength > 0;
      const hasBudget = job.fundingProgram?.budgetAmount !== null;

      if (hasText) textExtractionSuccess++;
      if (hasBudget) budgetExtractionSuccess++;

      completedJobs.push({
        title: job.fundingProgram?.title || 'Unknown',
        hasText,
        hasBudget,
        textLength: totalTextLength,
        attachmentCount: attachments.length,
      });
    }
  }

  // Display results
  console.log('JOB STATUS BREAKDOWN');
  console.log('-'.repeat(100));

  const statusOrder = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
  for (const status of statusOrder) {
    const count = statusCounts[status] || 0;
    const percentage = ((count / jobIds.length) * 100).toFixed(1);
    console.log(`  ${status}: ${count} (${percentage}%)`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('TEXT EXTRACTION RESULTS');
  console.log('='.repeat(100));

  const completedCount = statusCounts['COMPLETED'] || 0;
  if (completedCount > 0) {
    const textSuccessRate = ((textExtractionSuccess / completedCount) * 100).toFixed(1);
    console.log(`\nCompleted jobs: ${completedCount}`);
    console.log(`Text extraction successful: ${textExtractionSuccess} (${textSuccessRate}%)`);
    console.log(`Text extraction failed: ${completedCount - textExtractionSuccess}`);
  } else {
    console.log('\n⏳ No jobs completed yet. Process workers are still processing...');
  }

  console.log('\n' + '='.repeat(100));
  console.log('BUDGET EXTRACTION RESULTS');
  console.log('='.repeat(100));

  if (completedCount > 0) {
    const budgetSuccessRate = ((budgetExtractionSuccess / completedCount) * 100).toFixed(1);
    console.log(`\nBudget extraction successful: ${budgetExtractionSuccess} (${budgetSuccessRate}%)`);
    console.log(`Budget extraction failed: ${completedCount - budgetExtractionSuccess}`);

    // Show correlation
    console.log('\n📊 Correlation Analysis:');
    const bothSuccess = completedJobs.filter(j => j.hasText && j.hasBudget).length;
    const textButNoBudget = completedJobs.filter(j => j.hasText && !j.hasBudget).length;
    const noTextNoBudget = completedJobs.filter(j => !j.hasText && !j.hasBudget).length;

    console.log(`  Both text & budget: ${bothSuccess} jobs`);
    console.log(`  Has text but no budget: ${textButNoBudget} jobs (budget extraction issue)`);
    console.log(`  No text & no budget: ${noTextNoBudget} jobs (text extraction issue)`);
  }

  // Sample of completed jobs
  if (completedJobs.length > 0) {
    console.log('\n\n## SAMPLE COMPLETED JOBS (First 10):');
    console.log('-'.repeat(100));

    for (let i = 0; i < Math.min(10, completedJobs.length); i++) {
      const job = completedJobs[i];
      console.log(`\n${i + 1}. ${job.title.substring(0, 80)}...`);
      console.log(`   Attachments: ${job.attachmentCount} files`);
      console.log(`   Text extracted: ${job.hasText ? `YES (${job.textLength} chars)` : 'NO'}`);
      console.log(`   Budget found: ${job.hasBudget ? 'YES ✓' : 'NO ✗'}`);
    }

    if (completedJobs.length > 10) {
      console.log(`\n... and ${completedJobs.length - 10} more completed jobs`);
    }
  }

  console.log('\n\n' + '='.repeat(100));
  console.log('PROGRESS SUMMARY');
  console.log('='.repeat(100));

  const pending = statusCounts['PENDING'] || 0;
  const processing = statusCounts['PROCESSING'] || 0;
  const totalRemaining = pending + processing;

  console.log(`\n✅ Completed: ${completedCount}/${jobIds.length} (${((completedCount / jobIds.length) * 100).toFixed(1)}%)`);
  console.log(`⏳ Remaining: ${totalRemaining} jobs`);

  if (totalRemaining > 0) {
    console.log(`\n⏱️  Estimated time remaining: ${Math.ceil(totalRemaining / 5)} minutes`);
    console.log('   (assuming 5 jobs/minute processing rate)');
  } else {
    console.log('\n🎉 All jobs completed!');
  }

  console.log('\n' + '='.repeat(100));
  console.log('END OF PROGRESS REPORT');
  console.log('='.repeat(100) + '\n');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
