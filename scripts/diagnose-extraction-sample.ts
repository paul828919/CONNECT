import { db } from '../lib/db';
import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';

async function diagnoseSample() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      ELIGIBILITY EXTRACTION DIAGNOSTIC                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get a non-DCP program with attachments
  const program = await db.scraping_jobs.findFirst({
    where: {
      NOT: { announcementTitle: { contains: 'DCP' } },
      announcementTitle: { contains: '바이오' }, // Biomedical program
    },
    select: {
      announcementTitle: true,
      detailPageData: true,
      fundingProgram: {
        select: {
          eligibilityCriteria: true,
          requiredCertifications: true,
          requiredOperatingYears: true,
          maxOperatingYears: true,
        },
      },
    },
  });

  if (!program || !program.detailPageData) {
    console.log('❌ No program found or no extracted text');
    return;
  }

  console.log('📄 Program:', program.announcementTitle.substring(0, 70) + '...\n');

  const detailData = program.detailPageData as any;
  const extractedText = detailData.extractedText || '';

  console.log('📊 Extracted Text Stats:');
  console.log(`   Length: ${extractedText.length} characters`);
  console.log(`   From announcement files: ${detailData.announcementFilesText?.length || 0} chars`);
  console.log(`   From other files: ${detailData.otherFilesText?.length || 0} chars\n`);

  // Show first 2000 chars
  console.log('📝 First 2000 characters:');
  console.log('─'.repeat(80));
  console.log(extractedText.substring(0, 2000));
  console.log('─'.repeat(80));
  console.log();

  // Check for eligibility keywords
  console.log('🔍 Checking for eligibility section indicators:');
  const indicators = [
    { pattern: /지원\s*[요대]?상/, name: '지원대상/지원요상 (Support target)' },
    { pattern: /신청\s*자격/, name: '신청자격 (Application qualification)' },
    { pattern: /참여\s*[요자]건/, name: '참여요건/참여자건 (Participation requirements)' },
    { pattern: /중소기업/, name: '중소기업 (SME)' },
    { pattern: /벤처/, name: '벤처 (Venture)' },
    { pattern: /설립\s*\d+년/, name: '설립 N년 (Founded N years)' },
    { pattern: /근로자\s*\d+명/, name: '근로자 N명 (N employees)' },
  ];

  for (const { pattern, name } of indicators) {
    const matches = extractedText.match(new RegExp(pattern, 'g'));
    if (matches) {
      console.log(`   ✅ Found ${matches.length}x: ${name}`);
      const firstMatch = extractedText.match(pattern);
      if (firstMatch) {
        const index = extractedText.indexOf(firstMatch[0]);
        const context = extractedText.substring(index, index + 150);
        console.log(`      Context: "${context.substring(0, 100)}..."`);
      }
    } else {
      console.log(`   ❌ Not found: ${name}`);
    }
  }
  console.log();

  // Run extraction
  console.log('🧪 Running extractEligibilityCriteria...');
  const extracted = extractEligibilityCriteria(extractedText);
  console.log('📊 Extraction Result:');
  console.log(JSON.stringify(extracted, null, 2));
  console.log();

  // Compare with database
  console.log('💾 Database Saved Values:');
  console.log(`   requiredCertifications: [${program.fundingProgram?.requiredCertifications.join(', ')}]`);
  console.log(`   requiredOperatingYears: ${program.fundingProgram?.requiredOperatingYears || 'null'}`);
  console.log(`   maxOperatingYears: ${program.fundingProgram?.maxOperatingYears || 'null'}`);
  console.log(`   eligibilityCriteria:`);
  console.log(JSON.stringify(program.fundingProgram?.eligibilityCriteria, null, 2));

  await db.$disconnect();
}

diagnoseSample().catch(console.error);
