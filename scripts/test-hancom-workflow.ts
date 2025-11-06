/**
 * Test Hancom Docs HWP to PDF Converter - Complete Workflow
 *
 * Tests the newly rewritten multi-tab workflow:
 * 1. OAuth login
 * 2. Direct "문서 업로드" button click on dashboard
 * 3. Upload notification handling
 * 4. New tab detection for editor
 * 5. File menu → PDF download
 * 6. Editor tab close and dashboard return
 */

import * as path from 'path';
import * as fs from 'fs';
import { convertHWPToPDFViaHancomDocs, cleanupBrowser } from '../lib/scraping/utils/hancom-docs-converter';

async function testHancomWorkflow() {
  console.log('\n=== Hancom Docs Converter Test - Multi-Tab Workflow ===\n');

  // Sample HWP file path
  const hwpFilePath = '/app/data/ntis-attachments/01. 2026년도 바이오접합체 기술선도형 플랫폼 구축 신규 공동과제 공모서.hwp';

  // Check if file exists
  if (!fs.existsSync(hwpFilePath)) {
    console.error(`✗ Test file not found: ${hwpFilePath}`);
    console.log('\nAvailable files in /app/data/ntis-attachments:');
    const files = fs.readdirSync('/app/data/ntis-attachments').filter(f => f.endsWith('.hwp') || f.endsWith('.hwpx'));
    files.slice(0, 5).forEach(f => console.log(`  - ${f}`));

    if (files.length > 0) {
      const firstFile = path.join('/app/data/ntis-attachments', files[0]);
      console.log(`\nUsing first available file: ${files[0]}\n`);
      return testConversion(firstFile);
    } else {
      console.error('✗ No HWP files found in /app/data/ntis-attachments');
      return;
    }
  }

  return testConversion(hwpFilePath);
}

async function testConversion(hwpFilePath: string) {
  const outputDir = '/tmp';

  console.log(`Testing conversion: ${path.basename(hwpFilePath)}`);
  console.log(`Output directory: ${outputDir}\n`);

  try {
    // Run conversion
    const result = await convertHWPToPDFViaHancomDocs(hwpFilePath, outputDir);

    // Display logs
    console.log('\n=== Conversion Logs ===');
    result.logs.forEach(log => console.log(log));

    // Display results
    console.log('\n=== Conversion Result ===');
    console.log(`Success: ${result.success ? '✓' : '✗'}`);
    console.log(`PDF Path: ${result.pdfPath || 'N/A'}`);
    console.log(`Text Length: ${result.textLength} characters`);
    console.log(`Is Garbled: ${result.isGarbled ? 'Yes' : 'No'}`);
    console.log(`Error: ${result.error || 'None'}`);

    if (result.success) {
      console.log('\n✓ Conversion successful!');
      console.log(`PDF saved to: ${result.pdfPath}`);
    } else {
      console.log('\n✗ Conversion failed!');
      console.log(`Error: ${result.error}`);
    }

  } catch (error: any) {
    console.error('\n✗ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup browser
    await cleanupBrowser();
    console.log('\n=== Test Complete ===\n');
  }
}

// Run test
testHancomWorkflow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
