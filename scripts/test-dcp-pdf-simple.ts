import * as fs from 'fs';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { extractEligibilityCriteria } from '../lib/scraping/parsers/ntis-announcement-parser';

async function test() {
  const pdfPath = '/Users/paulkim/Downloads/2025년_딥테크_챌린지_프로젝트(DCP)_지원계획_공_100005700622372875.pdf';

  console.log('Reading PDF:', pdfPath);
  const buffer = fs.readFileSync(pdfPath);
  console.log('File size:', buffer.length);

  console.log('\nExtracting text...');
  const text = await extractTextFromAttachment('dcp.pdf', buffer);

  if (!text) {
    console.log('NO TEXT EXTRACTED!');
    return;
  }

  console.log('Extracted length:', text.length);
  console.log('\nFirst 1000 chars:');
  console.log(text.substring(0, 1000));
  console.log('\n---\n');

  console.log('Running extractEligibilityCriteria...');
  const result = extractEligibilityCriteria(text);

  console.log('\nRESULT:');
  console.log(JSON.stringify(result, null, 2));

  if (result?.financialRequirements?.investmentThreshold) {
    console.log('\n✅ Investment extracted:', result.financialRequirements.investmentThreshold.minimumAmount);
  } else {
    console.log('\n❌ No investment threshold');
  }
}

test().catch(console.error);
