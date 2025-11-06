// Search for budget value 256 in full HWPX extraction
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

function extractTextFromHWPXSection(obj: any): string {
  let text = '';
  if (!obj) return text;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractTextFromHWPXSection(item) + ' ';
    }
    return text;
  }
  if (obj['hp:t']) {
    const textContent = obj['hp:t'];
    if (typeof textContent === 'string') {
      text += textContent + ' ';
    }
  }
  if (obj['#text']) {
    text += obj['#text'] + ' ';
  }
  for (const key of Object.keys(obj)) {
    if (key !== 'hp:t' && key !== '#text' && !key.startsWith('@_') && typeof obj[key] === 'object') {
      text += extractTextFromHWPXSection(obj[key]) + ' ';
    }
  }
  return text;
}

async function searchFor256() {
  const jobId = 'fc62ffe1-aed3-4eae-b84c-524c41af639e';
  const job = await prisma.scraping_jobs.findUnique({ where: { id: jobId } });

  if (!job || !job.attachmentFolder) {
    console.log('❌ Job not found');
    return;
  }

  const filePath = path.join(job.attachmentFolder, job.attachmentFilenames[0]);
  const fileBuffer = fs.readFileSync(filePath);
  const zip = new AdmZip(fileBuffer);

  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  let fullText = '';

  for (const entry of zip.getEntries()) {
    if (entry.entryName.match(/Contents\/section\d+\.xml$/i)) {
      const xmlContent = entry.getData().toString('utf8');
      const parsed = xmlParser.parse(xmlContent);
      const sectionText = extractTextFromHWPXSection(parsed);
      if (sectionText) {
        fullText += sectionText + '\n';
      }
    }
  }

  console.log(`📝 Total extracted text: ${fullText.length} characters`);
  console.log('');

  // Search for "256"
  const positions: number[] = [];
  let pos = fullText.indexOf('256');
  while (pos !== -1) {
    positions.push(pos);
    pos = fullText.indexOf('256', pos + 1);
  }

  console.log(`🔍 Found ${positions.length} occurrences of "256":`);
  positions.forEach((position, index) => {
    const context = fullText.substring(Math.max(0, position - 100), Math.min(fullText.length, position + 100));
    console.log(`\n[${index + 1}] Position ${position}:`);
    console.log(`"...${context.replace(/\s+/g, ' ')}..."`);
  });

  // Search for table header patterns
  console.log('\n\n🔍 Searching for table patterns with "사업비":');
  const patterns = [
    /'25년\s*사업비/,
    /사업비.*256/,
    /256.*사업비/,
    /사전기획60\+연구개발196/,
  ];

  patterns.forEach((pattern) => {
    const match = fullText.match(pattern);
    if (match) {
      const pos = fullText.indexOf(match[0]);
      const context = fullText.substring(Math.max(0, pos - 100), Math.min(fullText.length, pos + 200));
      console.log(`\n✅ Pattern matched: ${pattern}`);
      console.log(`   Context: "...${context.replace(/\s+/g, ' ')}..."`);
    } else {
      console.log(`\n❌ Pattern not matched: ${pattern}`);
    }
  });
}

searchFor256().finally(() => prisma.$disconnect());
