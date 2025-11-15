/**
 * Diagnose Attachment File Issues
 *
 * Checks if attachment files actually exist on disk and can be read
 */

import { db } from '@/lib/db';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔍 Finding programs WITH actual attachment files\n');

  // Find programs that claim to have attachments
  const programsWithAttachments = await db.funding_programs.findMany({
    where: {
      scrapedAt: { gte: new Date('2024-01-01') }
    },
    include: {
      scraping_job: {
        where: {
          attachmentCount: { gt: 0 }
        },
        select: {
          id: true,
          attachmentCount: true,
          attachmentFolder: true,
          attachmentFilenames: true,
          scrapingStatus: true
        }
      },
      eligibility_verification: {
        orderBy: { extractionRun: 'desc' },
        take: 1
      }
    }
  });

  const withAttachments = programsWithAttachments.filter(p => p.scraping_job !== null);
  console.log(`Found ${withAttachments.length} programs claiming to have attachments\n`);

  // Check first 5 programs
  for (let i = 0; i < Math.min(5, withAttachments.length); i++) {
    const program = withAttachments[i];
    console.log('━'.repeat(80));
    console.log(`📋 [${i+1}] ${program.title.substring(0, 60)}...`);
    console.log(`    ID: ${program.id.substring(0, 8)}...`);
    console.log(`    Scraped: ${program.scrapedAt?.toISOString().split('T')[0]}`);
    console.log(`    Claimed Attachments: ${program.scraping_job!.attachmentCount}`);
    console.log(`    Filenames Array Length: ${program.scraping_job!.attachmentFilenames.length}`);

    // Check if files actually exist
    const folder = program.scraping_job!.attachmentFolder;
    const filenames = program.scraping_job!.attachmentFilenames;

    // Normalize path
    let relativePath = folder;
    if (relativePath.startsWith('/app/data/ntis-attachments/')) {
      relativePath = relativePath.replace('/app/data/ntis-attachments/', '');
    } else if (relativePath.startsWith('/app/data/scraper/ntis-attachments/')) {
      relativePath = relativePath.replace('/app/data/scraper/ntis-attachments/', '');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? '/app/data/scraper' : './data/scraper';
    const dirPath = join(baseDir, 'ntis-attachments', relativePath);

    console.log(`\n    Folder Path: ${dirPath}`);
    console.log(`    Folder Exists: ${existsSync(dirPath)}`);

    if (existsSync(dirPath)) {
      const actualFiles = readdirSync(dirPath);
      console.log(`    Actual Files on Disk: ${actualFiles.length}`);

      if (actualFiles.length > 0) {
        console.log(`    Files: ${actualFiles.join(', ')}`);

        // Try to read first file
        const firstFile = actualFiles[0];
        const filePath = join(dirPath, firstFile);
        const stats = statSync(filePath);
        console.log(`\n    First file: ${firstFile}`);
        console.log(`    Size: ${(stats.size / 1024).toFixed(2)} KB`);

        // If it's a PDF, try to extract text preview
        if (firstFile.toLowerCase().endsWith('.pdf')) {
          try {
            const pdfParse = require('pdf-parse');
            const dataBuffer = readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            const preview = pdfData.text.substring(0, 500).replace(/\s+/g, ' ');
            console.log(`    Text Preview: ${preview}...`);
            console.log(`    Total Text Length: ${pdfData.text.length} chars`);

            // Look for eligibility keywords
            const text = pdfData.text;
            const hasEligibility = /지원대상|지원요건|신청자격|참여요건|벤처기업|기업부설연구소|연구개발전담부서/i.test(text);
            console.log(`    Contains Eligibility Keywords: ${hasEligibility ? '✓' : '✗'}`);

            if (hasEligibility) {
              // Extract sample of eligibility section
              const match = text.match(/지원대상|지원요건|신청자격|참여요건/i);
              if (match && match.index) {
                const sample = text.substring(match.index, match.index + 300).replace(/\s+/g, ' ');
                console.log(`    Eligibility Sample: ${sample}...`);
              }
            }
          } catch (e: any) {
            console.log(`    PDF extraction failed: ${e.message}`);
          }
        }
      }
    } else {
      console.log(`    ❌ Folder does not exist!`);
    }

    // Check verification status
    if (program.eligibility_verification.length > 0) {
      const v = program.eligibility_verification[0];
      console.log(`\n    Verification:`);
      console.log(`    • Method: ${v.extractionMethod}`);
      console.log(`    • Confidence: ${v.confidence}`);
      console.log(`    • Required Certs: ${JSON.stringify(v.requiredCertifications)}`);
      console.log(`    • Preferred Certs: ${JSON.stringify(v.preferredCertifications)}`);
    }

    console.log('');
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
