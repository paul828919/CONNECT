// Manual test script for parser verification
import { PrismaClient } from '@prisma/client';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { extractBudget } from '../lib/scraping/parsers/ntis-announcement-parser';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function processJob() {
  const jobId = 'fc62ffe1-aed3-4eae-b84c-524c41af639e';

  const job = await prisma.scraping_jobs.findUnique({
    where: { id: jobId }
  });

  if (!job || !job.attachmentFolder) {
    console.log('❌ Job not found or no attachments');
    return;
  }

  console.log('📋 Job:', job.announcementTitle);
  console.log('📁 Folder:', job.attachmentFolder);
  console.log('📎 Files:', job.attachmentFilenames);

  // Read the HWPX file
  const filePath = path.join(job.attachmentFolder, job.attachmentFilenames[0]);
  console.log('📄 Reading:', filePath);

  const fileBuffer = fs.readFileSync(filePath);
  console.log('✅ File read:', fileBuffer.length, 'bytes');

  // Extract text
  const text = await extractTextFromAttachment(job.attachmentFilenames[0], fileBuffer);
  console.log('📝 Extracted text length:', text ? text.length : 0, 'chars');

  if (text) {
    // Extract budget
    const budget = extractBudget(text);
    console.log('💰 Budget extracted:', budget);
    console.log('');
    console.log('Full text output:');
    console.log('='.repeat(80));
    console.log(text);
    console.log('='.repeat(80));

    // Search for budget keywords
    const budgetKeywords = ['억원', '백만원', '지원규모', '사업비', '연구비'];
    console.log('\nSearching for budget keywords:');
    budgetKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        const index = text.indexOf(keyword);
        console.log(`✓ Found "${keyword}" at position ${index}`);
        console.log(`  Context: ...${text.substring(Math.max(0, index-50), index+50)}...`);
      }
    });
  }
}

processJob().finally(() => prisma.$disconnect());
