/**
 * Simple test script for Hancom Docs HWP-to-PDF conversion
 */

import { convertHWPToPDFViaHancomDocs, cleanupBrowser } from '../lib/scraping/utils/hancom-docs-converter';

async function testSimpleConversion() {
  console.log('=== Simple Hancom Docs Conversion Test ===\n');

  const hwpFilePath = '/tmp/test.hwp';
  const outputDir = '/tmp';

  try {
    console.log(`Testing file: ${hwpFilePath}`);
    console.log(`Output directory: ${outputDir}\n`);

    const result = await convertHWPToPDFViaHancomDocs(hwpFilePath, outputDir);

    console.log('\n=== Conversion Result ===');
    console.log(`Success: ${result.success ? '✅ YES' : '❌ NO'}`);
    console.log(`PDF Path: ${result.pdfPath || 'N/A'}`);
    console.log(`Error: ${result.error || 'None'}`);

    if (result.logs && result.logs.length > 0) {
      console.log('\n=== Detailed Logs ===');
      result.logs.forEach(log => console.log(`  ${log}`));
    }

    if (result.success && result.pdfPath) {
      console.log('\n✅ TEST PASSED - PDF generated successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ TEST FAILED - PDF generation failed');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await cleanupBrowser();
  }
}

testSimpleConversion();
