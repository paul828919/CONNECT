/**
 * Test V2 Extraction Patterns Directly Against PDF
 */

import { readFileSync } from 'fs';
import pdfParse from 'pdf-parse';

// V2 extraction function (copied from extract-eligibility-verification-v2.ts)
function extractCertifications(text: string): {
  required: string[];
  preferred: string[];
  notes: string[];
} {
  const required: string[] = [];
  const preferred: string[] = [];
  const notes: string[] = [];

  // Required patterns (V2)
  const requiredPatterns = [
    {
      keyword: '벤처기업',
      pattern: /벤처기업[를을이가의에]?(인증|확인서|확인|해당|필수|요구|필요)[된한하고하여임기업자]?/,
    },
    {
      keyword: 'INNO-BIZ',
      pattern: /(?:INNO-?BIZ|이노비즈)[를을이가의에]?(인증|확인|해당|필수|요구|기업)?/i,
    },
    {
      keyword: '연구개발전담부서',
      pattern: /연구(?:개발)?전담부서[를을이가의에]?(인증|인정|설치|보유|필수|필요)[하고하여된임]?/,
    },
    {
      keyword: '기업부설연구소',
      pattern: /기업부설연구소[를을이가의에]?(인정|인증|설치|보유|필수|요구|필요)[서하고하여된임]?/,
    },
    {
      keyword: '중소기업',
      pattern: /중소기업[를을이가의에]?(확인서|확인|해당|필수|한정|대상)[하고하여된임기업]?/,
    },
  ];

  // Extract required certifications
  for (const { keyword, pattern } of requiredPatterns) {
    const matches = [...text.matchAll(new RegExp(pattern, 'g'))];
    if (matches.length > 0) {
      required.push(keyword);
      matches.forEach((match, idx) => {
        if (idx < 3) { // Show first 3 matches
          notes.push(`✓ Required: ${keyword} - matched "${match[0]}"`);
        }
      });
    }
  }

  return { required, preferred, notes };
}

async function main() {
  const pdfPath = '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments/20250101_to_20250131/page-1/announcement-420/2. 2025년도 제1차 백신실용화기술개발사업단 신규지원 대상과제 재공고 안내_81507145248371380.pdf';

  console.log('🔍 Testing V2 Extraction Patterns\n');
  console.log('PDF:', pdfPath.split('/').pop());
  console.log('');

  // Read PDF directly with pdf-parse (no truncation)
  const fileBuffer = readFileSync(pdfPath);
  const pdfData = await pdfParse(fileBuffer);
  const text = pdfData.text;

  console.log(`Text length: ${text.length} characters\n`);

  // Test V2 patterns
  const { required, preferred, notes } = extractCertifications(text);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EXTRACTION RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Required Certifications: [${required.join(', ')}]`);
  console.log(`Preferred Certifications: [${preferred.join(', ')}]`);
  console.log('');
  console.log('Match Details:');
  notes.forEach(note => console.log(`  ${note}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Show text samples around "기업부설연구소"
  const keyword = '기업부설연구소';
  const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'g');
  const samples = [...text.matchAll(regex)];

  if (samples.length > 0) {
    console.log(`\n📝 Text samples containing "${keyword}":\n`);
    samples.slice(0, 3).forEach((match, idx) => {
      const clean = match[0].replace(/\s+/g, ' ');
      console.log(`[${idx + 1}] ${clean}\n`);
    });
  }
}

main().catch(console.error);
