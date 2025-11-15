/**
 * Analyze Eligibility Text Structure
 *
 * Examines actual PDF text to understand how eligibility criteria are written
 */

import { db } from '@/lib/db';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔍 Analyzing Actual Eligibility Text Structure\n');

  // Get program #2 which we know has good eligibility text
  const program = await db.funding_programs.findUnique({
    where: { id: 'ac5dd51c-335e-4818-8125-1e2cfe869d47' }, // Program #2 from diagnostic
    include: {
      scraping_job: {
        select: {
          attachmentFolder: true,
          attachmentFilenames: true
        }
      }
    }
  });

  if (!program || !program.scraping_job) {
    console.log('Program not found');
    return;
  }

  const folder = program.scraping_job.attachmentFolder;
  const filenames = program.scraping_job.attachmentFilenames;

  if (filenames.length === 0) {
    console.log('No attachments');
    return;
  }

  // Normalize path
  let relativePath = folder;
  if (relativePath.startsWith('/app/data/ntis-attachments/')) {
    relativePath = relativePath.replace('/app/data/ntis-attachments/', '');
  } else if (relativePath.startsWith('/app/data/scraper/ntis-attachments/')) {
    relativePath = relativePath.replace('/app/data/scraper/ntis-attachments/', '');
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const baseDir = isProduction ? '/app/data/scraper' : './data/scraper';
  const pdfFile = filenames.find(f => f.toLowerCase().endsWith('.pdf'));

  if (!pdfFile) {
    console.log('No PDF file found');
    return;
  }

  const filePath = join(baseDir, 'ntis-attachments', relativePath, pdfFile);

  if (!existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  console.log(`Reading: ${pdfFile}\n`);

  const pdfParse = require('pdf-parse');
  const dataBuffer = readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);

  const text = pdfData.text;
  console.log(`Total text length: ${text.length} characters\n`);

  // Find all eligibility-related sections
  const eligibilityKeywords = [
    '지원대상',
    '지원요건',
    '신청자격',
    '참여요건',
    '신청요건',
    '지원 대상',
    '신청 자격',
    '참여 자격'
  ];

  for (const keyword of eligibilityKeywords) {
    const regex = new RegExp(`${keyword}[^가-힣]*([가-힣\\s\\(\\)\\-·○●■□▶▷]+)`, 'g');
    const matches = [...text.matchAll(regex)];

    if (matches.length > 0) {
      console.log(`━━━ Found "${keyword}" (${matches.length} matches) ━━━`);
      matches.slice(0, 2).forEach((match, idx) => {
        const context = match[0].substring(0, 500).replace(/\s+/g, ' ');
        console.log(`[${idx + 1}] ${context}...\n`);
      });
    }
  }

  // Look for certification mentions
  console.log('\n━━━ Certification Mentions ━━━');
  const certKeywords = [
    '벤처기업',
    'INNO-BIZ',
    '이노비즈',
    '연구개발전담부서',
    '기업부설연구소',
    '중소기업',
    '기술혁신형 중소기업',
    'DCP'
  ];

  for (const cert of certKeywords) {
    const regex = new RegExp(`${cert}[^가-힣]{0,50}[가-힣]{1,100}`, 'g');
    const matches = [...text.matchAll(regex)];

    if (matches.length > 0) {
      console.log(`\n${cert}:`);
      matches.slice(0, 3).forEach((match) => {
        const context = match[0].substring(0, 150).replace(/\s+/g, ' ');
        console.log(`  - ${context}...`);
      });
    }
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
