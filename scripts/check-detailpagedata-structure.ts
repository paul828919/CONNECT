import { db } from '../lib/db';

async function checkStructure() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      DETAIL PAGE DATA STRUCTURE ANALYSIS                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get one DCP and one non-DCP program
  const [dcpProgram, nonDcpProgram] = await Promise.all([
    db.scraping_jobs.findFirst({
      where: { announcementTitle: { contains: 'DCP' } },
      select: {
        announcementTitle: true,
        detailPageData: true,
        fundingProgram: {
          select: {
            requiredCertifications: true,
            requiredOperatingYears: true,
          },
        },
      },
    }),
    db.scraping_jobs.findFirst({
      where: {
        NOT: { announcementTitle: { contains: 'DCP' } },
        announcementTitle: { contains: '바이오' },
      },
      select: {
        announcementTitle: true,
        detailPageData: true,
        fundingProgram: {
          select: {
            requiredCertifications: true,
            requiredOperatingYears: true,
          },
        },
      },
    }),
  ]);

  console.log('🎯 DCP Program:');
  console.log(`   Title: ${dcpProgram?.announcementTitle.substring(0, 60)}...`);
  console.log(`   detailPageData keys: ${Object.keys((dcpProgram?.detailPageData as any) || {}).join(', ')}`);

  const dcpData = dcpProgram?.detailPageData as any;
  if (dcpData) {
    console.log(`   extractedText: ${dcpData.extractedText?.length || 0} chars`);
    console.log(`   announcementFilesText: ${dcpData.announcementFilesText?.length || 0} chars`);
    console.log(`   otherFilesText: ${dcpData.otherFilesText?.length || 0} chars`);
    console.log(`   rawHtmlText: ${dcpData.rawHtmlText?.length || 0} chars`);
    console.log(`   description: ${dcpData.description?.length || 0} chars`);
  }
  console.log();

  console.log('📋 Non-DCP Program:');
  console.log(`   Title: ${nonDcpProgram?.announcementTitle.substring(0, 60)}...`);
  console.log(`   detailPageData keys: ${Object.keys((nonDcpProgram?.detailPageData as any) || {}).join(', ')}`);

  const nonDcpData = nonDcpProgram?.detailPageData as any;
  if (nonDcpData) {
    console.log(`   extractedText: ${nonDcpData.extractedText?.length || 0} chars`);
    console.log(`   announcementFilesText: ${nonDcpData.announcementFilesText?.length || 0} chars`);
    console.log(`   otherFilesText: ${nonDcpData.otherFilesText?.length || 0} chars`);
    console.log(`   rawHtmlText: ${nonDcpData.rawHtmlText?.length || 0} chars`);
    console.log(`   description: ${nonDcpData.description?.length || 0} chars`);

    // Show sample of rawHtmlText if exists
    if (nonDcpData.rawHtmlText) {
      console.log('\n   Sample rawHtmlText (first 500 chars):');
      console.log('   ' + '─'.repeat(76));
      console.log('   ' + nonDcpData.rawHtmlText.substring(0, 500));
      console.log('   ' + '─'.repeat(76));
    }
  }
  console.log();

  console.log('💾 Extraction Results in DB:');
  console.log(`   DCP required certs: [${dcpProgram?.fundingProgram?.requiredCertifications.join(', ')}]`);
  console.log(`   DCP operating years: ${dcpProgram?.fundingProgram?.requiredOperatingYears || 'null'}`);
  console.log(`   Non-DCP required certs: [${nonDcpProgram?.fundingProgram?.requiredCertifications.join(', ')}]`);
  console.log(`   Non-DCP operating years: ${nonDcpProgram?.fundingProgram?.requiredOperatingYears || 'null'}`);

  await db.$disconnect();
}

checkStructure().catch(console.error);
