// Debug year-based budget pattern
import { PrismaClient } from '@prisma/client';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function debugPattern() {
  const jobId = 'fc62ffe1-aed3-4eae-b84c-524c41af639e';
  const job = await prisma.scraping_jobs.findUnique({ where: { id: jobId } });

  if (!job || !job.attachmentFolder) {
    console.log('❌ Job not found');
    return;
  }

  const filePath = path.join(job.attachmentFolder, job.attachmentFilenames[0]);
  const fileBuffer = fs.readFileSync(filePath);
  const text = await extractTextFromAttachment(job.attachmentFilenames[0], fileBuffer);

  if (!text) {
    console.log('❌ No text extracted');
    return;
  }

  console.log('📝 Text length:', text.length);
  console.log('📍 Position of "256":', text.indexOf('256'));
  console.log('');

  // Test year-based patterns
  const pattern1 = /['']?(\d{2}|20\d{2})년\s*([\\d,\\.]+)\s*억원/i;
  const pattern2 = /['']?(\d{2}|20\d{2})년\s*([\\d,\\.]+)\s*백만원/i;

  console.log('Testing pattern 1 (억원):');
  const match1 = text.match(pattern1);
  console.log('  Match:', match1 ? match1[0] : 'NO MATCH');
  if (match1) console.log('  Amount:', match1[2]);

  console.log('');
  console.log('Testing pattern 2 (백만원):');
  const match2 = text.match(pattern2);
  console.log('  Match:', match2 ? match2[0] : 'NO MATCH');
  if (match2) console.log('  Amount:', match2[2]);

  // Find context around "2025년 256"
  const pos = text.indexOf('2025년 256');
  if (pos !== -1) {
    console.log('');
    console.log('✅ Found "2025년 256" at position', pos);
    const context = text.substring(pos, Math.min(text.length, pos + 100));
    console.log('Context:', context);

    // Check character codes
    const snippet = text.substring(pos, pos + 15);
    console.log('');
    console.log('Character analysis:');
    console.log('  String:', JSON.stringify(snippet));
    console.log('  Char codes:', [...snippet].map((c, i) => `[${i}]${c}=${c.charCodeAt(0)}`).join(' '));
  } else {
    console.log('');
    console.log('❌ "2025년 256" not found');

    // Try finding just "256백만원"
    const pos2 = text.indexOf('256백만원');
    if (pos2 !== -1) {
      console.log('✅ Found "256백만원" at position', pos2);
      const context = text.substring(Math.max(0, pos2 - 50), Math.min(text.length, pos2 + 50));
      console.log('Context:', context);
    }
  }
}

debugPattern().finally(() => prisma.$disconnect());
