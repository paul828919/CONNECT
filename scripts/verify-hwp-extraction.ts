#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('HWP TEXT EXTRACTION VERIFICATION');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');

  // Get jobs from the last 2 hours with HWP attachments
  const recentJobs = await prisma.scraping_jobs.findMany({
    where: {
      processingStatus: {
        in: ['SKIPPED', 'COMPLETED']
      },
      updatedAt: {
        gte: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    },
    orderBy: {
      updatedAt: 'desc'
    },
    take: 10,
    select: {
      id: true,
      announcementTitle: true,
      processingStatus: true,
      updatedAt: true,
      detailPageData: true,
      fundingProgramId: true
    }
  });

  console.log(`Found ${recentJobs.length} recently processed jobs in last 2 hours`);
  console.log('');

  let hwpJobsFound = 0;
  let hwpWithText = 0;

  recentJobs.forEach((job, i) => {
    const data = job.detailPageData as any;
    const attachments = data?.attachments || [];
    const hwpAttachments = attachments.filter((a: any) =>
      a.filename?.endsWith('.hwp') || a.filename?.endsWith('.hwpx')
    );

    if (hwpAttachments.length > 0) {
      hwpJobsFound++;
      const hasText = hwpAttachments.some((a: any) => a.text && a.text.length > 50);

      if (hasText) {
        hwpWithText++;
      }

      console.log(`${i + 1}. ${job.announcementTitle.substring(0, 55)}...`);
      console.log(`   Status: ${job.processingStatus}`);
      console.log(`   Updated: ${job.updatedAt}`);
      console.log(`   HWP files: ${hwpAttachments.length}`);

      hwpAttachments.forEach((hwp: any) => {
        const textLen = hwp.text?.length || 0;
        console.log(`   ├─ ${hwp.filename}`);
        console.log(`   │  Text: ${textLen > 0 ? '✅ ' + textLen.toLocaleString() + ' chars' : '❌ NO TEXT'}`);
        if (textLen > 0) {
          console.log(`   │  Preview: ${hwp.text.substring(0, 100).replace(/\n/g, ' ')}...`);
        }
      });
      console.log('');
    }
  });

  console.log('────────────────────────────────────────────────────────────────');
  console.log('SUMMARY');
  console.log('────────────────────────────────────────────────────────────────');
  console.log('');
  console.log(`Total jobs checked: ${recentJobs.length}`);
  console.log(`Jobs with HWP files: ${hwpJobsFound}`);
  console.log(`Jobs with extracted text: ${hwpWithText}`);
  console.log(`Success rate: ${hwpJobsFound > 0 ? ((hwpWithText / hwpJobsFound) * 100).toFixed(1) + '%' : 'N/A'}`);
  console.log('');

  if (hwpWithText === 0 && hwpJobsFound > 0) {
    console.log('⚠️  WARNING: HWP files found but NO text extracted!');
    console.log('   The processor may not be running correctly.');
  } else if (hwpWithText > 0) {
    console.log('✅ Text extraction is WORKING correctly!');
  } else {
    console.log('ℹ️  No HWP files processed in last 2 hours.');
    console.log('   This is normal if processor has not started yet.');
  }
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
