/**
 * Comprehensive V2 Extraction Test (HWP-PROPER)
 *
 * Tests V2 extraction patterns against 50 real HWP/HWPX/PDF files
 * PROPER IMPLEMENTATION:
 * - Uses pyhwp first for HWP files
 * - Falls back to Hancom Tesseract with SHARED browser (one login for all files)
 * - Avoids login restrictions by reusing authenticated session
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import pdfParse from 'pdf-parse';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as path from 'path';
import type { Browser } from 'playwright';
import { createAuthenticatedHancomBrowser, convertHWPViaHancomTesseract } from '@/lib/scraping/utils/hancom-docs-tesseract-converter';

const execAsync = promisify(exec);

// V1 Patterns (Current - FAILED)
const v1Patterns = {
  벤처기업: /벤처기업\s*(인증|확인서|필수|요구)/,
  'INNO-BIZ': /INNO-?BIZ\s*(인증|필수|요구)/,
  연구개발전담부서: /연구개발전담부서\s*(인증|설치|필수)/,
  기업부설연구소: /기업부설연구소\s*(인정|설치|필수|요구)/,
  중소기업: /중소기업\s*(확인서|필수|한정)/,
};

// V2 Patterns (Improved - WORKING)
const v2Patterns = {
  벤처기업: /벤처기업[를을이가의에]?(인증|확인서|확인|해당|필수|요구|필요)[된한하고하여임기업자]?/,
  'INNO-BIZ': /(?:INNO-?BIZ|이노비즈)[를을이가의에]?(인증|확인|해당|필수|요구|기업)?/i,
  연구개발전담부서: /연구(?:개발)?전담부서[를을이가의에]?(인증|인정|설치|보유|필수|필요)[하고하여된임]?/,
  기업부설연구소: /기업부설연구소[를을이가의에]?(인정|인증|설치|보유|필수|요구|필요)[서하고하여된임]?/,
  중소기업: /중소기업[를을이가의에]?(확인서|확인|해당|필수|한정|대상)[하고하여된임기업]?/,
};

interface TestResult {
  file: string;
  extension: string;
  textLength: number;
  v1Matches: string[];
  v2Matches: string[];
  improvement: boolean;
  matchSamples: Array<{ keyword: string; matched: string }>;
  extractionMethod: 'pyhwp' | 'hancom-ocr' | 'hwpx' | 'pdf';
}

interface FileStats {
  hwp: number;
  hwpx: number;
  pdf: number;
  hwpSuccess: number;
  hwpxSuccess: number;
  pdfSuccess: number;
  pyhwpSuccess: number;
  hancomSuccess: number;
}

// Extract text from HWP using pyhwp
async function extractTextFromHWPViaHwp5(fileBuffer: Buffer, fileName: string): Promise<string | null> {
  let tempHwpPath: string | null = null;

  try {
    // Save buffer to temp file
    const tempDir = os.tmpdir();
    tempHwpPath = path.join(tempDir, `hwp5-${Date.now()}-${fileName}`);
    writeFileSync(tempHwpPath, fileBuffer);

    // Extract text using hwp5txt
    const { stdout, stderr } = await execAsync(`/Users/paulkim/Library/Python/3.9/bin/hwp5txt "${tempHwpPath}"`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 10000,
    });

    if (stderr && stderr.includes('Error')) {
      return null;
    }

    const text = stdout.trim();
    return text.length > 0 ? text.substring(0, 50000) : null;
  } catch (error: any) {
    return null;
  } finally {
    // Cleanup
    if (tempHwpPath && readFileSync) {
      try {
        const fs = require('fs');
        if (fs.existsSync(tempHwpPath)) {
          fs.unlinkSync(tempHwpPath);
        }
      } catch {}
    }
  }
}

// Extract text from HWPX
async function extractTextFromHWPX(buffer: Buffer): Promise<string | null> {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    let extractedText = '';

    for (const entry of zipEntries) {
      if (entry.entryName.match(/Contents\/section\d+\.xml$/i)) {
        const xmlContent = entry.getData().toString('utf8');
        const parsed = xmlParser.parse(xmlContent);
        const sectionText = extractTextFromObject(parsed);
        if (sectionText) {
          extractedText += sectionText + '\n';
        }
      }
    }

    return extractedText.length > 0 ? extractedText.substring(0, 50000).trim() : null;
  } catch (error) {
    return null;
  }
}

function extractTextFromObject(obj: any): string {
  let text = '';

  if (typeof obj === 'string') return obj;
  if (!obj) return '';

  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractTextFromObject(item) + ' ';
    }
    return text;
  }

  if (typeof obj === 'object') {
    if (obj['hp:t']) text += extractTextFromObject(obj['hp:t']) + ' ';
    if (obj['#text']) text += obj['#text'] + ' ';

    for (const key of Object.keys(obj)) {
      if (key !== 'hp:t' && key !== '#text' && key !== '@_') {
        text += extractTextFromObject(obj[key]) + ' ';
      }
    }
  }

  return text;
}

// Test extraction on a single file
async function testFile(
  filePath: string,
  sharedBrowser: Browser | null
): Promise<TestResult | null> {
  const fileName = filePath.split('/').pop()!;
  const ext = filePath.toLowerCase().endsWith('.hwpx') ? 'hwpx'
    : filePath.toLowerCase().endsWith('.hwp') ? 'hwp'
    : filePath.toLowerCase().endsWith('.pdf') ? 'pdf' : '';

  if (!ext) return null;

  try {
    const buffer = readFileSync(filePath);
    let text: string | null = null;
    let extractionMethod: TestResult['extractionMethod'] = 'pdf';

    // Extract based on file type
    if (ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
      extractionMethod = 'pdf';
    } else if (ext === 'hwpx') {
      text = await extractTextFromHWPX(buffer);
      extractionMethod = 'hwpx';
    } else if (ext === 'hwp') {
      // Try pyhwp first
      text = await extractTextFromHWPViaHwp5(buffer, fileName);
      if (text && text.length > 0) {
        extractionMethod = 'pyhwp';
      } else if (sharedBrowser) {
        // Fallback to Hancom with shared browser
        text = await convertHWPViaHancomTesseract(buffer, fileName, sharedBrowser);
        extractionMethod = 'hancom-ocr';
      }
    }

    if (!text || text.length === 0) return null;

    // Test V1 patterns
    const v1Matches: string[] = [];
    for (const [keyword, pattern] of Object.entries(v1Patterns)) {
      if (pattern.test(text)) {
        v1Matches.push(keyword);
      }
    }

    // Test V2 patterns
    const v2Matches: string[] = [];
    const matchSamples: Array<{ keyword: string; matched: string }> = [];
    for (const [keyword, pattern] of Object.entries(v2Patterns)) {
      const match = text.match(pattern);
      if (match) {
        v2Matches.push(keyword);
        matchSamples.push({
          keyword,
          matched: match[0]
        });
      }
    }

    const improvement = v2Matches.length > v1Matches.length;

    return {
      file: fileName,
      extension: ext,
      textLength: text.length,
      v1Matches,
      v2Matches,
      improvement,
      matchSamples: matchSamples.slice(0, 3),
      extractionMethod,
    };
  } catch (error: any) {
    console.error(`Error processing ${fileName}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Comprehensive V2 Extraction Test (HWP-PROPER)          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const baseDir = '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments';

  // Find all HWP, HWPX and PDF files
  const allFiles: string[] = [];

  function findFiles(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        findFiles(fullPath);
      } else if (
        entry.toLowerCase().endsWith('.hwp') ||
        entry.toLowerCase().endsWith('.hwpx') ||
        entry.toLowerCase().endsWith('.pdf')
      ) {
        allFiles.push(fullPath);
      }
    }
  }

  console.log('📂 Scanning for test files...');
  findFiles(baseDir);
  console.log(`   Found ${allFiles.length} HWP/HWPX/PDF files\n`);

  // Test first 50 files
  const filesToTest = allFiles.slice(0, 50);
  console.log(`🧪 Testing ${filesToTest.length} files...\n`);

  // Create shared browser for Hancom conversions
  let sharedBrowser: Browser | null = null;
  const hwpFiles = filesToTest.filter(f => f.toLowerCase().endsWith('.hwp'));

  if (hwpFiles.length > 0) {
    console.log(`📝 ${hwpFiles.length} HWP files detected - creating shared browser for Hancom fallback...\n`);
    try {
      sharedBrowser = await createAuthenticatedHancomBrowser();
    } catch (error: any) {
      console.warn(`⚠️  Failed to create shared browser: ${error.message}`);
      console.warn('   Will skip Hancom fallback for HWP files\n');
    }
  }

  const results: TestResult[] = [];
  const stats: FileStats = {
    hwp: 0,
    hwpx: 0,
    pdf: 0,
    hwpSuccess: 0,
    hwpxSuccess: 0,
    pdfSuccess: 0,
    pyhwpSuccess: 0,
    hancomSuccess: 0,
  };
  let processed = 0;

  for (const file of filesToTest) {
    processed++;
    const fileName = file.split('/').pop()!;
    process.stdout.write(`   [${processed}/${filesToTest.length}] ${fileName.substring(0, 40)}...\r`);

    const result = await testFile(file, sharedBrowser);
    if (result) {
      results.push(result);

      // Track statistics
      if (result.extension === 'hwp') {
        stats.hwp++;
        if (result.v2Matches.length > 0) stats.hwpSuccess++;
        if (result.extractionMethod === 'pyhwp') stats.pyhwpSuccess++;
        if (result.extractionMethod === 'hancom-ocr') stats.hancomSuccess++;
      } else if (result.extension === 'hwpx') {
        stats.hwpx++;
        if (result.v2Matches.length > 0) stats.hwpxSuccess++;
      } else if (result.extension === 'pdf') {
        stats.pdf++;
        if (result.v2Matches.length > 0) stats.pdfSuccess++;
      }
    }
  }

  // Close shared browser
  if (sharedBrowser) {
    await sharedBrowser.close();
    console.log('\n✓ Shared browser closed\n');
  }

  console.log('\n');

  // Statistics
  const v1TotalMatches = results.reduce((sum, r) => sum + r.v1Matches.length, 0);
  const v2TotalMatches = results.reduce((sum, r) => sum + r.v2Matches.length, 0);
  const filesWithImprovement = results.filter(r => r.improvement).length;
  const filesWithV1Matches = results.filter(r => r.v1Matches.length > 0).length;
  const filesWithV2Matches = results.filter(r => r.v2Matches.length > 0).length;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Files Tested: ${results.length}`);
  console.log(`  • HWP: ${stats.hwp} (${stats.hwpSuccess} with matches = ${stats.hwp > 0 ? ((stats.hwpSuccess/stats.hwp)*100).toFixed(1) : 0}%)`);
  console.log(`    - pyhwp: ${stats.pyhwpSuccess} files`);
  console.log(`    - Hancom OCR: ${stats.hancomSuccess} files`);
  console.log(`  • HWPX: ${stats.hwpx} (${stats.hwpxSuccess} with matches = ${stats.hwpx > 0 ? ((stats.hwpxSuccess/stats.hwpx)*100).toFixed(1) : 0}%)`);
  console.log(`  • PDF: ${stats.pdf} (${stats.pdfSuccess} with matches = ${stats.pdf > 0 ? ((stats.pdfSuccess/stats.pdf)*100).toFixed(1) : 0}%)`);
  console.log('');
  console.log('V1 Pattern Performance (Current):');
  console.log(`  • Files with matches: ${filesWithV1Matches} (${((filesWithV1Matches / results.length) * 100).toFixed(1)}%)`);
  console.log(`  • Total certifications extracted: ${v1TotalMatches}`);
  console.log('');
  console.log('V2 Pattern Performance (Improved):');
  console.log(`  • Files with matches: ${filesWithV2Matches} (${((filesWithV2Matches / results.length) * 100).toFixed(1)}%)`);
  console.log(`  • Total certifications extracted: ${v2TotalMatches}`);
  console.log('');
  console.log('Improvement:');
  console.log(`  • Files with better results: ${filesWithImprovement} (${((filesWithImprovement / results.length) * 100).toFixed(1)}%)`);
  console.log(`  • Additional matches found: ${v2TotalMatches - v1TotalMatches}`);
  console.log(`  • Extraction rate improvement: ${(((filesWithV2Matches - filesWithV1Matches) / results.length) * 100).toFixed(1)}%`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Show top 10 improved files
  const improved = results
    .filter(r => r.improvement)
    .sort((a, b) => (b.v2Matches.length - b.v1Matches.length) - (a.v2Matches.length - a.v1Matches.length))
    .slice(0, 10);

  if (improved.length > 0) {
    console.log('\n🎯 Top 10 Files with Most Improvement:\n');
    improved.forEach((result, idx) => {
      console.log(`[${idx + 1}] ${result.file.substring(0, 60)}... (${result.extractionMethod})`);
      console.log(`    V1: [${result.v1Matches.join(', ')}]`);
      console.log(`    V2: [${result.v2Matches.join(', ')}]`);
      if (result.matchSamples.length > 0) {
        console.log(`    Sample: "${result.matchSamples[0].matched}"`);
      }
      console.log('');
    });
  }

  // Show V2-only matches
  const v2Only = results.filter(r => r.v2Matches.length > 0 && r.v1Matches.length === 0);

  if (v2Only.length > 0) {
    console.log(`\n✨ V2-Only Matches (${v2Only.length} files where V1 found nothing):\n`);
    v2Only.slice(0, 5).forEach((result, idx) => {
      console.log(`[${idx + 1}] ${result.file.substring(0, 60)}... (${result.extractionMethod})`);
      console.log(`    Found: [${result.v2Matches.join(', ')}]`);
      if (result.matchSamples.length > 0) {
        console.log(`    Sample: "${result.matchSamples[0].matched}"`);
      }
      console.log('');
    });
  }
}

main().catch(console.error);
