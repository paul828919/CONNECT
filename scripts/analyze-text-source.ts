import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get one "successful" fast program (0.031s)
  const fastSuccess = await prisma.scraping_jobs.findFirst({
    where: {
      processingStatus: 'COMPLETED',
      attachmentFolder: '/app/data/scraper/ntis-attachments/20250201_to_20250331/page-9/announcement-442'
    },
    select: {
      id: true,
      announcementTitle: true,
      detailPageData: true
    }
  });

  if (!fastSuccess) {
    console.log('❌ Fast success program not found');
    return;
  }

  console.log('='.repeat(80));
  console.log('FAST "SUCCESSFUL" PROGRAM (0.031s, 265KB data)');
  console.log('='.repeat(80));
  console.log(`ID: ${fastSuccess.id}`);
  console.log(`Title: ${fastSuccess.announcementTitle.substring(0, 70)}...`);
  console.log('');

  const data = fastSuccess.detailPageData as any;

  console.log('📊 detailPageData structure:');
  console.log(`   Has "attachments" key: ${!!data.attachments}`);
  console.log(`   Attachments count: ${data.attachments?.length || 0}`);
  console.log('');

  if (data.attachments && data.attachments.length > 0) {
    console.log('📎 Attachment details:');
    data.attachments.forEach((att: any, i: number) => {
      console.log(`   ${i + 1}. ${att.filename || 'Unnamed'}`);
      console.log(`      Has text: ${att.text ? 'YES' : 'NO'}`);
      console.log(`      Text length: ${att.text?.length || 0} chars`);
      console.log(`      Text preview: ${att.text?.substring(0, 100) || 'N/A'}...`);
      console.log('');
    });
  }

  // Check if text is in other fields
  const otherKeys = Object.keys(data).filter(k => k !== 'attachments');
  console.log(`📋 Other fields in detailPageData: ${otherKeys.join(', ')}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
