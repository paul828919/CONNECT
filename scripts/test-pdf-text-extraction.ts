import pdfParse from 'pdf-parse';
import * as fs from 'fs';

async function testExtraction() {
  const pdfBuffer = fs.readFileSync('/tmp/polaris-converted.pdf');
  const data = await pdfParse(pdfBuffer);

  console.log('=== PDF Text Extraction ===\n');
  console.log(`Total pages: ${data.numpages}`);
  console.log(`Text length: ${data.text.length} characters\n`);
  console.log('--- First 1000 characters ---');
  console.log(data.text.substring(0, 1000));
  console.log('\n--- Last 500 characters ---');
  console.log(data.text.substring(Math.max(0, data.text.length - 500)));

  // Save full text
  fs.writeFileSync('/tmp/polaris-extracted-text.txt', data.text);
  console.log('\n✓ Full text saved to: /tmp/polaris-extracted-text.txt');
}

testExtraction();
