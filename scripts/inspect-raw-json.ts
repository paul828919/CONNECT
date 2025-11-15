import { db } from '../lib/db';

async function inspectRawJson() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      RAW JSON STRUCTURE INSPECTION                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get one non-DCP program
  const program = await db.scraping_jobs.findFirst({
    where: {
      NOT: { announcementTitle: { contains: 'DCP' } },
      announcementTitle: { contains: '바이오' },
    },
    select: {
      announcementTitle: true,
      detailPageData: true,
    },
  });

  if (!program) {
    console.log('❌ No program found');
    return;
  }

  console.log('📄 Program:', program.announcementTitle.substring(0, 70) + '...\n');

  console.log('📊 Full detailPageData JSON:');
  console.log(JSON.stringify(program.detailPageData, null, 2));

  await db.$disconnect();
}

inspectRawJson().catch(console.error);
