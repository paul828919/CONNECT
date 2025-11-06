// Inspect HWPX XML structure to understand text extraction
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

const prisma = new PrismaClient();

async function inspectHWPX() {
  const jobId = 'fc62ffe1-aed3-4eae-b84c-524c41af639e';
  const job = await prisma.scraping_jobs.findUnique({ where: { id: jobId } });

  if (!job || !job.attachmentFolder) {
    console.log('❌ Job not found');
    return;
  }

  const filePath = path.join(job.attachmentFolder, job.attachmentFilenames[0]);
  console.log('📄 File:', filePath);

  const fileBuffer = fs.readFileSync(filePath);
  const zip = new AdmZip(fileBuffer);

  // Extract section0.xml
  const section0 = zip.getEntry('Contents/section0.xml');
  if (!section0) {
    console.log('❌ No section0.xml found');
    return;
  }

  const xmlContent = section0.getData().toString('utf8');

  // Parse XML
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const parsed = xmlParser.parse(xmlContent);

  console.log('🔍 Root keys:', Object.keys(parsed));

  // Navigate to section (hs:sec)
  const section = parsed['hs:sec'];
  if (section) {
    console.log('\n🔍 hs:sec keys:', Object.keys(section));

    // Check for paragraphs
    if (section['hp:p']) {
      const paragraphs = Array.isArray(section['hp:p']) ? section['hp:p'] : [section['hp:p']];
      console.log(`\n📝 Found ${paragraphs.length} paragraphs`);

      // Show first 5 paragraphs structure
      for (let i = 0; i < Math.min(5, paragraphs.length); i++) {
        const p = paragraphs[i];
        console.log(`\n--- Paragraph ${i + 1} ---`);
        console.log('Keys:', Object.keys(p));

        if (p['hp:run']) {
          const runs = Array.isArray(p['hp:run']) ? p['hp:run'] : [p['hp:run']];
          console.log(`  ${runs.length} runs`);

          for (let j = 0; j < Math.min(2, runs.length); j++) {
            const run = runs[j];
            console.log(`  Run ${j + 1} keys:`, Object.keys(run));

            if (run['hp:t']) {
              console.log(`    ✅ TEXT FOUND: "${run['hp:t']}"`);
            }
            if (run['#text']) {
              console.log(`    ✅ #text FOUND: "${run['#text']}"`);
            }

            // Show full structure for first run
            if (i === 0 && j === 0) {
              console.log('    Full run structure:');
              console.log(JSON.stringify(run, null, 2).substring(0, 500));
            }
          }
        }
      }

      // Search for budget keywords in paragraphs
      console.log('\n\n💰 Searching for budget keywords...');
      let foundBudgetText = false;

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const runs = Array.isArray(p['hp:run']) ? p['hp:run'] : (p['hp:run'] ? [p['hp:run']] : []);

        for (const run of runs) {
          const text = run['hp:t'] || run['#text'] || '';
          if (typeof text === 'string' && (text.includes('억원') || text.includes('백만원') || text.includes('지원규모'))) {
            console.log(`  ✅ Found in paragraph ${i + 1}:`);
            console.log(`     "${text}"`);
            foundBudgetText = true;
          }
        }
      }

      if (!foundBudgetText) {
        console.log('  ❌ No budget keywords found in paragraphs');
      }
    } else {
      console.log('\n❌ No hp:p (paragraphs) found in section');
    }
  }
}

inspectHWPX().finally(() => prisma.$disconnect());
