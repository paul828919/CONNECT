import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatus() {
  const statusCounts = await prisma.scraping_jobs.groupBy({
    by: ['processingStatus'],
    _count: true
  });

  console.log('\n📊 Job Status Summary:');
  console.log('─'.repeat(80));

  let total = 0;
  const statusMap: Record<string, number> = {};

  for (const status of statusCounts) {
    statusMap[status.processingStatus] = status._count;
    total += status._count;
  }

  console.log(`PENDING:    ${statusMap.PENDING || 0}`);
  console.log(`PROCESSING: ${statusMap.PROCESSING || 0}`);
  console.log(`COMPLETED:  ${statusMap.COMPLETED || 0}`);
  console.log(`FAILED:     ${statusMap.FAILED || 0}`);
  console.log(`TOTAL:      ${total}`);

  if (statusMap.COMPLETED > 0) {
    const completed = await prisma.scraping_jobs.findMany({
      where: {
        processingStatus: 'COMPLETED'
      },
      select: {
        id: true,
        detailPageData: true,
        fundingProgram: {
          select: {
            budgetAmount: true
          }
        }
      }
    });

    let textSuccess = 0;
    let budgetSuccess = 0;

    for (const job of completed) {
      const data = job.detailPageData as any;
      const attachments = data?.attachments || [];

      const hasText = attachments.some((att: any) => att.text && att.text.length > 0);
      const hasBudget = job.fundingProgram && job.fundingProgram.budgetAmount != null;

      if (hasText) textSuccess++;
      if (hasBudget) budgetSuccess++;
    }

    const completedCount = statusMap.COMPLETED;
    console.log(`\n✅ Extraction Success Rates:`);
    console.log(`Text extracted:   ${textSuccess}/${completedCount} (${((textSuccess/completedCount)*100).toFixed(1)}%)`);
    console.log(`Budget extracted: ${budgetSuccess}/${completedCount} (${((budgetSuccess/completedCount)*100).toFixed(1)}%)`);
  }

  await prisma.$disconnect();
}

checkStatus().catch(console.error);
