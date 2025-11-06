import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeStatus() {
  console.log('\n📊 NTIS Text Extraction Analysis');
  console.log('═'.repeat(100));

  // Get all jobs
  const allJobs = await prisma.scraping_jobs.findMany({
    select: {
      id: true,
      announcementTitle: true,
      attachmentCount: true,
      processingStatus: true,
      processingError: true,
      detailPageData: true,
      fundingProgram: {
        select: {
          budgetAmount: true
        }
      }
    }
  });

  console.log(`\nTotal jobs: ${allJobs.length}`);

  // Categorize by status
  const statusGroups = {
    PENDING: allJobs.filter(j => j.processingStatus === 'PENDING'),
    PROCESSING: allJobs.filter(j => j.processingStatus === 'PROCESSING'),
    COMPLETED: allJobs.filter(j => j.processingStatus === 'COMPLETED'),
    FAILED: allJobs.filter(j => j.processingStatus === 'FAILED')
  };

  console.log(`\n📋 Status Breakdown:`);
  console.log(`  PENDING:    ${statusGroups.PENDING.length}`);
  console.log(`  PROCESSING: ${statusGroups.PROCESSING.length}`);
  console.log(`  COMPLETED:  ${statusGroups.COMPLETED.length}`);
  console.log(`  FAILED:     ${statusGroups.FAILED.length}`);

  // Analyze completed jobs
  if (statusGroups.COMPLETED.length > 0) {
    console.log(`\n\n📈 COMPLETED Jobs Analysis (${statusGroups.COMPLETED.length} jobs):`);
    console.log('─'.repeat(100));

    const withText: any[] = [];
    const withoutText: any[] = [];
    const withBudget: any[] = [];
    const withoutBudget: any[] = [];

    for (const job of statusGroups.COMPLETED) {
      const data = job.detailPageData as any;
      const attachments = data?.attachments || [];

      const totalTextLength = attachments.reduce((sum: number, att: any) =>
        sum + (att.text ? att.text.length : 0), 0
      );

      const hasText = totalTextLength > 0;
      const hasBudget = job.fundingProgram && job.fundingProgram.budgetAmount != null;

      if (hasText) {
        withText.push({
          title: job.announcementTitle,
          textLength: totalTextLength,
          attachmentCount: job.attachmentCount,
          hasBudget
        });
      } else {
        withoutText.push({
          title: job.announcementTitle,
          attachmentCount: job.attachmentCount,
          hasBudget
        });
      }

      if (hasBudget) withBudget.push(job);
      else withoutBudget.push(job);
    }

    console.log(`\n✅ With extracted text: ${withText.length} (${((withText.length/statusGroups.COMPLETED.length)*100).toFixed(1)}%)`);
    console.log(`❌ Without extracted text: ${withoutText.length} (${((withoutText.length/statusGroups.COMPLETED.length)*100).toFixed(1)}%)`);

    console.log(`\n💰 With budget: ${withBudget.length} (${((withBudget.length/statusGroups.COMPLETED.length)*100).toFixed(1)}%)`);
    console.log(`❌ Without budget: ${withoutBudget.length} (${((withoutBudget.length/statusGroups.COMPLETED.length)*100).toFixed(1)}%)`);

    // Correlation analysis
    const textAndBudget = withText.filter(j => j.hasBudget).length;
    const textNoBudget = withText.filter(j => !j.hasBudget).length;

    console.log(`\n🔗 Correlation (Text vs Budget):`);
    console.log(`  Text + Budget:    ${textAndBudget} (${((textAndBudget/withText.length)*100).toFixed(1)}% of jobs with text)`);
    console.log(`  Text, No Budget:  ${textNoBudget} (${((textNoBudget/withText.length)*100).toFixed(1)}% of jobs with text)`);

    // Show sample of successes
    console.log(`\n✅ Sample Successful Text Extractions (first 10):`);
    console.log('─'.repeat(100));
    withText.slice(0, 10).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.title.substring(0, 80)}...`);
      console.log(`   Text: ${job.textLength.toLocaleString()} chars | Attachments: ${job.attachmentCount} | Budget: ${job.hasBudget ? 'YES' : 'NO'}`);
    });

    // Show sample of failures (jobs with attachments but no text)
    const failedWithAttachments = withoutText.filter(j => j.attachmentCount > 0);
    if (failedWithAttachments.length > 0) {
      console.log(`\n\n❌ Failed Extractions (have attachments but no text) - First 10 of ${failedWithAttachments.length}:`);
      console.log('─'.repeat(100));
      failedWithAttachments.slice(0, 10).forEach((job, i) => {
        console.log(`\n${i + 1}. ${job.title.substring(0, 80)}...`);
        console.log(`   Attachments: ${job.attachmentCount} | Budget: ${job.hasBudget ? 'YES' : 'NO'}`);
      });
    }

    // Jobs with no attachments
    const noAttachments = withoutText.filter(j => j.attachmentCount === 0);
    if (noAttachments.length > 0) {
      console.log(`\n\n📭 No Attachments (${noAttachments.length} jobs):`);
      console.log('   These jobs have no files to extract text from');
    }
  }

  // Analyze failed jobs
  if (statusGroups.FAILED.length > 0) {
    console.log(`\n\n❌ FAILED Jobs (${statusGroups.FAILED.length}):`);
    console.log('─'.repeat(100));

    statusGroups.FAILED.slice(0, 10).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.announcementTitle.substring(0, 80)}...`);
      console.log(`   Attachments: ${job.attachmentCount}`);
      console.log(`   Error: ${job.processingError?.substring(0, 150)}...`);
    });
  }

  await prisma.$disconnect();
}

analyzeStatus().catch(console.error);
