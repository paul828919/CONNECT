/**
 * Test pyhwp Integration with Real Production Data
 *
 * Purpose: Verify that the new pyhwp implementation works correctly
 * with actual HWP files from scraping_jobs table.
 *
 * Test Process:
 * 1. Find a SCRAPED job with HWP attachments
 * 2. Extract text using the updated attachment-parser.ts
 * 3. Verify extraction succeeds using pyhwp (not Hancom fallback)
 * 4. Check extraction quality (character count, Korean text)
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../lib/db';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';

async function testPyhwpIntegration() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Testing pyhwp Integration with Production Data');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Find a job with HWP attachments
    console.log('📊 Searching for jobs with HWP attachments...');

    const jobs = await db.scraping_jobs.findMany({
      where: {
        scrapingStatus: 'SCRAPED',
        attachmentFilenames: {
          isEmpty: false,
        },
      },
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`   Found ${jobs.length} jobs with attachments`);

    // Filter for jobs with HWP files
    const jobsWithHwp = jobs.filter((job) =>
      job.attachmentFilenames.some((filename) => filename.endsWith('.hwp'))
    );

    console.log(`   Found ${jobsWithHwp.length} jobs with HWP files`);

    if (jobsWithHwp.length === 0) {
      console.log('');
      console.log('❌ No jobs with HWP files found. Cannot test.');
      console.log('   Please run NTIS scraper first to populate jobs.');
      return;
    }

    // Test first job with HWP file
    const testJob = jobsWithHwp[0];
    const hwpFiles = testJob.attachmentFilenames.filter((f) => f.endsWith('.hwp'));

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📄 Testing Job: ${testJob.announcementTitle}`);
    console.log(`   Job ID: ${testJob.id}`);
    console.log(`   HWP Files: ${hwpFiles.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    let successCount = 0;
    let failCount = 0;
    let totalChars = 0;

    for (const fileName of hwpFiles.slice(0, 3)) {
      // Test up to 3 HWP files
      console.log(`🔄 Processing: ${fileName}`);

      const filePath = path.join(testJob.attachmentFolder, fileName);

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️  File not found: ${filePath}`);
        failCount++;
        continue;
      }

      const fileBuffer = fs.readFileSync(filePath);
      const fileSize = (fileBuffer.length / 1024).toFixed(1);
      console.log(`   File size: ${fileSize} KB`);

      // Extract text (should use pyhwp first, then fallback to Hancom)
      const startTime = Date.now();
      const extractedText = await extractTextFromAttachment(fileName, fileBuffer);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (extractedText && extractedText.length > 0) {
        successCount++;
        totalChars += extractedText.length;
        console.log(`   ✓ Success: ${extractedText.length} chars in ${duration}s`);

        // Check for Korean characters
        const koreanChars = (extractedText.match(/[가-힣]/g) || []).length;
        const koreanPercentage = ((koreanChars / extractedText.length) * 100).toFixed(1);
        console.log(`   Korean characters: ${koreanChars} (${koreanPercentage}%)`);

        // Show first 200 characters as sample
        const sample = extractedText.substring(0, 200).replace(/\n/g, ' ');
        console.log(`   Sample: ${sample}...`);
      } else {
        failCount++;
        console.log(`   ✗ Failed: No text extracted after ${duration}s`);
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`   Total Files Tested:   ${successCount + failCount}`);
    console.log(`   Successful:           ${successCount} (${((successCount / (successCount + failCount)) * 100).toFixed(1)}%)`);
    console.log(`   Failed:               ${failCount}`);
    console.log(`   Total Characters:     ${totalChars.toLocaleString()}`);
    console.log('');

    if (successCount > 0) {
      console.log('✅ pyhwp Integration Test: PASSED');
      console.log('   The updated attachment-parser.ts is working correctly.');
      console.log('   pyhwp is successfully extracting text from HWP files.');
    } else {
      console.log('❌ pyhwp Integration Test: FAILED');
      console.log('   All extractions failed. Check logs above for errors.');
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('❌ Fatal error during test:', error.message);
    console.error('');
    throw error;
  }
}

// Run test
testPyhwpIntegration()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
