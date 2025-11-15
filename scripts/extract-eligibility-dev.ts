/**
 * Eligibility Extraction R&D Script
 *
 * Purpose: Develop and test regex patterns for extracting 3 specific eligibility types
 * from Korean government R&D announcement files (HWP/HWPX/PDF).
 *
 * This is a DEVELOPMENT script for iterative pattern refinement.
 * Once patterns are perfected, they will be migrated to lib/scraping/worker.ts.
 *
 * The 3 Eligibility Types (REVISED November 10, 2025):
 * 1. Corporate + 기업부설연구소 (in-house research institute)
 * 2. Corporate + 연구개발전담부서 (dedicated R&D department)
 * 3. Corporate + INNO-BIZ or 벤처기업 certification
 *
 * REMOVED Types 3-6 (Investment-based eligibility criteria):
 * - Type 3: Corporate + 1-2억원 investment (100-200 million won) - REMOVED
 * - Type 4: Corporate + 3-5억원 investment (300-500 million won) - REMOVED
 * - Type 5: Corporate + 6-10억원 investment (600 million - 1 billion won) - REMOVED
 * - Type 6: Corporate + 11-20억원 investment (1.1-2 billion won) - REMOVED
 *
 * Reason for Removal (November 10, 2025):
 * Full dataset analysis revealed 100% false positive rate (186/186 matches) for Types 3-6.
 * Regex patterns cannot distinguish "investment received from investors" (투자유치금액)
 * from "research funding amounts" (연구비/정부지원금) in Korean text.
 * All matches were about research budget allocation, NOT investment eligibility.
 * Requires NLP/AI for semantic context understanding - beyond regex capabilities.
 *
 * Usage:
 * npx tsx scripts/extract-eligibility-dev.ts
 *
 * Output:
 * data/eligibility-extraction-results.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractTextFromAttachment } from '../lib/scraping/utils/attachment-parser';
import { createAuthenticatedHancomBrowser } from '../lib/scraping/utils/hancom-docs-tesseract-converter';
import type { Browser } from 'playwright';

// ============================================================
// Configuration
// ============================================================

const ATTACHMENTS_DIR = '/Users/paulkim/Downloads/connect/data/scraper/ntis-attachments';
const OUTPUT_FILE = '/Users/paulkim/Downloads/connect/data/eligibility-extraction-results.json';
const MAX_FILES_TO_PROCESS = Infinity; // Full dataset extraction

// ============================================================
// Types
// ============================================================

interface EligibilityMatch {
  type: string;
  matched: boolean;
  matchedText?: string;
  pattern?: string;
}

interface ExtractionResult {
  announcementFolder: string;
  attachmentFile: string;
  fileSize: number;
  extractionMethod: 'pyhwp' | 'hancom-tesseract' | 'pdf-parse' | 'failed';
  extractionDuration: number;
  textLength: number;
  koreanCharPercentage: number;
  eligibilityMatches: {
    type1_CorporateResearchInstitute: EligibilityMatch;
    type2_CorporateDedicatedRnD: EligibilityMatch;
    // REMOVED November 10, 2025 - 100% false positive rate (research funding vs investment)
    // type3_Investment100to200M: EligibilityMatch;
    // type4_Investment300to500M: EligibilityMatch;
    // type5_Investment600Mto1B: EligibilityMatch;
    // type6_Investment1_1to2B: EligibilityMatch;
    type7_InnoBizOrVenture: EligibilityMatch;
  };
  fullText?: string; // Optional: Include for debugging (may make file large)
}

interface Summary {
  totalFilesProcessed: number;
  successfulExtractions: number;
  failedExtractions: number;
  extractionMethodBreakdown: {
    pyhwp: number;
    hancomTesseract: number;
    pdfParse: number;
    failed: number;
  };
  eligibilityTypeMatches: {
    type1_CorporateResearchInstitute: number;
    type2_CorporateDedicatedRnD: number;
    // REMOVED November 10, 2025 - 100% false positive rate
    // type3_Investment100to200M: number;
    // type4_Investment300to500M: number;
    // type5_Investment600Mto1B: number;
    // type6_Investment1_1to2B: number;
    type7_InnoBizOrVenture: number;
  };
  processingTime: number;
}

// ============================================================
// Eligibility Extraction Functions (V1 - To Be Refined)
// ============================================================

/**
 * Type 1: Corporate + 기업부설연구소 (In-house Corporate Research Institute)
 *
 * Pattern Strategy:
 * - Look for "기업부설연구소" keyword
 * - Handle particles: 를/을/이/가/의/에
 * - Handle action verbs: 보유/인정/인증/설치/필수/요구
 * - Must appear in context of "기업" (corporation)
 */
function extractType1_CorporateResearchInstitute(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: Direct mention with particles and verbs
    /기업부설연구소[를을이가의에]?\s*(?:보유|인정|인증|설치|운영|필수|요구|필요)[하고하여한된임기업서]*/g,

    // Pattern 2: In eligibility section context
    /(?:지원대상|신청자격|참여요건|신청요건).*?기업부설연구소.*?(?:보유|인정|인증)/g,

    // Pattern 3: Corporate entity + research institute requirement
    /기업.*?기업부설연구소.*?(?:보유|인정|필수)/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'Type 1: Corporate + 기업부설연구소',
        matched: true,
        matchedText: match[0],
        pattern: pattern.toString(),
      };
    }
  }

  return {
    type: 'Type 1: Corporate + 기업부설연구소',
    matched: false,
  };
}

/**
 * Type 2: Corporate + 연구개발전담부서 (Dedicated R&D Department)
 */
function extractType2_CorporateDedicatedRnD(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: Direct mention
    /연구개발전담부서[를을이가의에]?\s*(?:보유|인정|인증|설치|운영|필수|요구|필요)[하고하여한된임기업서]*/g,

    // Pattern 2: Shortened form "연구전담부서"
    /연구전담부서[를을이가의에]?\s*(?:보유|인정|인증|설치|운영|필수)/g,

    // Pattern 3: In context
    /기업.*?연구개발전담부서.*?(?:보유|인정|필수)/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'Type 2: Corporate + 연구개발전담부서',
        matched: true,
        matchedText: match[0],
        pattern: pattern.toString(),
      };
    }
  }

  return {
    type: 'Type 2: Corporate + 연구개발전담부서',
    matched: false,
  };
}

/**
 * Type 3: Corporate + 1-2억원 Investment (100-200 million won)
 *
 * ❌ REMOVED November 10, 2025 - 100% False Positive Rate
 *
 * Reason: Full dataset analysis (1,742 files) showed 39 matches, but ALL were false positives.
 * Matched text was about "research equipment budgets" (연구장비 구입), NOT "investment received from investors."
 *
 * Example False Positive:
 * "1억원 미만 연구장비 구입... 1억원 이상의 연구장비는..."
 * Translation: "Research equipment purchase under 100M won... Research equipment 100M won or more..."
 *
 * Root Cause: Regex patterns cannot distinguish semantic context:
 * - "1억원" can mean both "100M won investment received" (target) and "100M won research budget" (false positive)
 * - Korean announcements use identical number formats for investment vs research funding
 * - Requires NLP/AI for semantic understanding - beyond regex capabilities
 *
 * This function is preserved for historical reference but not called.
 */
/*
function extractType3_Investment100to200M(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: Explicit range with 이상...이하
    /1억\s*원?\s*이상\s*2억\s*원?\s*이하/g,
    /100백만\s*원?\s*이상\s*200백만\s*원?\s*이하/g,

    // Pattern 2: Range with delimiters (~, -, 에서)
    /1억\s*원?\s*[~\-]\s*2억\s*원?/g,
    /100백만\s*원?\s*[~\-]\s*200백만\s*원?/g,

    // Pattern 3: Investment context (avoid debt ratio context)
    /(?<!부채총액|유동비율|부채비율|자기자본비율).*?(?:투자|투자금|투자유치).*?1억.*?2억/g,

    // Pattern 4: Eligibility specification with explicit amounts
    /(?:지원대상|신청자격|참여요건).*?1억\s*원?.*?2억\s*원?/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Additional validation: Ensure matched text doesn't contain debt ratio keywords
      const matchedText = match[0];
      if (!/부채|유동비율|자기자본|재무건전성/.test(matchedText)) {
        return {
          type: 'Type 3: Corporate + 1-2억원 Investment',
          matched: true,
          matchedText: matchedText,
          pattern: pattern.toString(),
        };
      }
    }
  }

  return {
    type: 'Type 3: Corporate + 1-2억원 Investment',
    matched: false,
  };
}
*/

/**
 * Type 4: Corporate + 3-5억원 Investment (300-500 million won)
 *
 * ❌ REMOVED November 10, 2025 - 100% False Positive Rate + Over-Matching
 *
 * Reason: Full dataset analysis (1,742 files) showed 49 matches, but ALL were false positives.
 * Matched text was about "government research funding amounts" (정부지원연구개발비), NOT "investment received."
 *
 * Example False Positive:
 * "신청자격... 정부지원연구개발비의 3배 이상..."
 * Translation: "Application qualifications... 3 times or more of government research funding..."
 *
 * Additional Issue - Severe Over-Matching:
 * Greedy `.*?` patterns captured 2,120-41,101 characters instead of specific phrases.
 * Example: Pattern matched entire "신청자격 (Application Qualifications)" section.
 *
 * Root Cause: Same semantic ambiguity as Type 3 - cannot distinguish investment vs research funding.
 *
 * This function is preserved for historical reference but not called.
 */
/*
function extractType4_Investment300to500M(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: Explicit range with 이상...이하
    /3억\s*원?\s*이상\s*5억\s*원?\s*이하/g,
    /300백만\s*원?\s*이상\s*500백만\s*원?\s*이하/g,

    // Pattern 2: Range with delimiters (~, -, 에서)
    /3억\s*원?\s*[~\-]\s*5억\s*원?/g,
    /300백만\s*원?\s*[~\-]\s*500백만\s*원?/g,

    // Pattern 3: Investment context (avoid debt ratio context)
    /(?<!부채총액|유동비율|부채비율|자기자본비율).*?(?:투자|투자금|투자유치).*?3억.*?5억/g,

    // Pattern 4: Eligibility specification with explicit amounts
    /(?:지원대상|신청자격|참여요건).*?3억\s*원?.*?5억\s*원?/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Additional validation: Ensure matched text doesn't contain debt ratio keywords
      const matchedText = match[0];
      if (!/부채|유동비율|자기자본|재무건전성/.test(matchedText)) {
        return {
          type: 'Type 4: Corporate + 3-5억원 Investment',
          matched: true,
          matchedText: matchedText,
          pattern: pattern.toString(),
        };
      }
    }
  }

  return {
    type: 'Type 4: Corporate + 3-5억원 Investment',
    matched: false,
  };
}
*/

/**
 * Type 5: Corporate + 6-10억원 Investment (600 million - 1 billion won)
 *
 * ❌ REMOVED November 10, 2025 - 100% False Positive Rate
 *
 * Reason: Full dataset analysis (1,742 files) showed 44 matches, but ALL were false positives.
 * Matched text was about "government grant amounts" (정부지분 지원), NOT "investment received from investors."
 *
 * Example False Positive:
 * "정부지분 지원 ‣ 과제당 3억원 / 1년 ('25년은 2.25억원/9개월)..."
 * Translation: "Government funding support ‣ 300M won per project / year (225M won/9 months for 2025)..."
 *
 * Root Cause: Same semantic ambiguity - cannot distinguish government grants vs private investment.
 *
 * This function is preserved for historical reference but not called.
 */
/*
function extractType5_Investment600Mto1B(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: Explicit range with 이상...이하
    /6억\s*원?\s*이상\s*10억\s*원?\s*이하/g,
    /600백만\s*원?\s*이상\s*(?:10억|1,?000백만|천백만)\s*원?\s*이하/g,

    // Pattern 2: Range with delimiters (~, -, 에서)
    /6억\s*원?\s*[~\-]\s*10억\s*원?/g,
    /600백만\s*원?\s*[~\-]\s*(?:10억|1,?000백만)\s*원?/g,

    // Pattern 3: Investment context (avoid debt ratio context)
    /(?<!부채총액|유동비율|부채비율|자기자본비율).*?(?:투자|투자금|투자유치).*?6억.*?10억/g,

    // Pattern 4: Eligibility specification with explicit amounts
    /(?:지원대상|신청자격|참여요건).*?6억\s*원?.*?10억\s*원?/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Additional validation: Ensure matched text doesn't contain debt ratio keywords
      const matchedText = match[0];
      if (!/부채|유동비율|자기자본|재무건전성/.test(matchedText)) {
        return {
          type: 'Type 5: Corporate + 6-10억원 Investment',
          matched: true,
          matchedText: matchedText,
          pattern: pattern.toString(),
        };
      }
    }
  }

  return {
    type: 'Type 5: Corporate + 6-10억원 Investment',
    matched: false,
  };
}
*/

/**
 * Type 6: Corporate + 11-20억원 Investment (1.1-2 billion won)
 *
 * ❌ REMOVED November 10, 2025 - 100% False Positive Rate
 *
 * Reason: Full dataset analysis (1,742 files) showed 54 matches, but ALL were false positives.
 * Matched text was about "total research project budgets" (총 연구비 규모), NOT "investment received from investors."
 *
 * Example False Positive:
 * "총 연구비 규모에 따라, 달성해야 하는 누적점수는 아래와 같음... 10억원 이상 20억원 미만"
 * Translation: "According to total research funding scale, the cumulative score to achieve is as follows... 1B-2B won"
 *
 * Root Cause: Same semantic ambiguity - cannot distinguish project budgets vs private investment.
 *
 * This function is preserved for historical reference but not called.
 */
/*
function extractType6_Investment1_1to2B(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: Explicit range with 이상...이하
    /11억\s*원?\s*이상\s*20억\s*원?\s*이하/g,
    /1,?100백만\s*원?\s*이상\s*(?:20억|2,?000백만)\s*원?\s*이하/g,

    // Pattern 2: "Over 10억, under 20억" format
    /10억\s*원?\s*초과\s*20억\s*원?\s*이하/g,
    /10억\s*원?\s*이상\s*20억\s*원?\s*미만/g,

    // Pattern 3: Range with delimiters (~, -, 에서)
    /(?:11억|10억)\s*원?\s*[~\-]\s*20억\s*원?/g,
    /1,?100백만\s*원?\s*[~\-]\s*2,?000백만\s*원?/g,

    // Pattern 4: Single-sided requirements (15억 이상, 20억 이하)
    /15억\s*원?\s*이상/g,
    /20억\s*원?\s*이하/g,

    // Pattern 5: Investment context (avoid debt ratio context)
    /(?<!부채총액|유동비율|부채비율|자기자본비율).*?(?:투자|투자금|투자유치).*?(?:11억|10억).*?20억/g,

    // Pattern 6: Eligibility specification with explicit amounts
    /(?:지원대상|신청자격|참여요건).*?(?:11억|10억)\s*원?.*?20억\s*원?/g,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Additional validation: Ensure matched text doesn't contain debt ratio keywords
      const matchedText = match[0];
      if (!/부채|유동비율|자기자본|재무건전성/.test(matchedText)) {
        return {
          type: 'Type 6: Corporate + 11-20억원 Investment',
          matched: true,
          matchedText: matchedText,
          pattern: pattern.toString(),
        };
      }
    }
  }

  return {
    type: 'Type 6: Corporate + 11-20억원 Investment',
    matched: false,
  };
}
*/

/**
 * Type 7: Corporate + INNO-BIZ or 벤처기업 Certification
 */
function extractType7_InnoBizOrVenture(text: string): EligibilityMatch {
  const patterns = [
    // Pattern 1: INNO-BIZ certification
    /(?:INNO-?BIZ|이노비즈)[를을이가의에]?\s*(?:인증|확인서|확인|해당|필수|요구|기업|인정)[된한하고하여임서]*/gi,

    // Pattern 2: 벤처기업 certification
    /벤처기업[를을이가의에]?\s*(?:인증|확인서|확인|해당|필수|요구|필요|인정)[된한하고하여임서]*/g,

    // Pattern 3: Combined context
    /(?:INNO-?BIZ|이노비즈|벤처기업).*?(?:인증|확인|해당)/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'Type 7: Corporate + INNO-BIZ or 벤처기업',
        matched: true,
        matchedText: match[0],
        pattern: pattern.toString(),
      };
    }
  }

  return {
    type: 'Type 7: Corporate + INNO-BIZ or 벤처기업',
    matched: false,
  };
}

// ============================================================
// Main Extraction Logic
// ============================================================

/**
 * Process a single announcement file
 */
async function processAnnouncementFile(
  filePath: string,
  fileName: string,
  announcementFolder: string,
  sharedBrowser?: Browser
): Promise<ExtractionResult | null> {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📄 Processing: ${fileName}`);
    console.log(`   Folder: ${path.basename(announcementFolder)}`);
    console.log(`${'='.repeat(80)}`);

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;
    console.log(`   File size: ${(fileSize / 1024).toFixed(2)} KB`);

    // Extract text (uses pyhwp + Hancom Tesseract fallback)
    const startTime = Date.now();
    const extractedText = await extractTextFromAttachment(fileName, fileBuffer, sharedBrowser);
    const duration = Date.now() - startTime;

    if (!extractedText || extractedText.length === 0) {
      console.log(`   ❌ FAILED: No text extracted after ${(duration / 1000).toFixed(2)}s`);
      return {
        announcementFolder,
        attachmentFile: fileName,
        fileSize,
        extractionMethod: 'failed',
        extractionDuration: duration,
        textLength: 0,
        koreanCharPercentage: 0,
        eligibilityMatches: {
          type1_CorporateResearchInstitute: { type: 'Type 1', matched: false },
          type2_CorporateDedicatedRnD: { type: 'Type 2', matched: false },
          // REMOVED Types 3-6 (November 10, 2025)
          // type3_Investment100to200M: { type: 'Type 3', matched: false },
          // type4_Investment300to500M: { type: 'Type 4', matched: false },
          // type5_Investment600Mto1B: { type: 'Type 5', matched: false },
          // type6_Investment1_1to2B: { type: 'Type 6', matched: false },
          type7_InnoBizOrVenture: { type: 'Type 7', matched: false },
        },
      };
    }

    // Calculate Korean character percentage
    const koreanChars = (extractedText.match(/[가-힣]/g) || []).length;
    const koreanPercentage = (koreanChars / extractedText.length) * 100;

    console.log(`   ✅ SUCCESS: ${extractedText.length} chars in ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Korean chars: ${koreanChars} (${koreanPercentage.toFixed(1)}%)`);

    // Determine extraction method (heuristic based on duration)
    let extractionMethod: 'pyhwp' | 'hancom-tesseract' | 'pdf-parse';
    if (fileName.endsWith('.pdf')) {
      extractionMethod = 'pdf-parse';
    } else if (duration < 5000) {
      extractionMethod = 'pyhwp'; // Fast extraction (< 5s) = pyhwp
    } else {
      extractionMethod = 'hancom-tesseract'; // Slow extraction (> 5s) = Hancom fallback
    }
    console.log(`   Extraction method: ${extractionMethod}`);

    // Apply eligibility extraction patterns
    console.log(`\n   🔍 Extracting eligibility types...`);

    const type1 = extractType1_CorporateResearchInstitute(extractedText);
    const type2 = extractType2_CorporateDedicatedRnD(extractedText);
    // REMOVED Types 3-6 (November 10, 2025) - 100% false positive rate
    // const type3 = extractType3_Investment100to200M(extractedText);
    // const type4 = extractType4_Investment300to500M(extractedText);
    // const type5 = extractType5_Investment600Mto1B(extractedText);
    // const type6 = extractType6_Investment1_1to2B(extractedText);
    const type7 = extractType7_InnoBizOrVenture(extractedText);

    // Log matches
    const matches = [type1, type2, type7]; // Reduced from 7 to 3 types
    const matchedCount = matches.filter(m => m.matched).length;

    console.log(`\n   📊 Eligibility Matches: ${matchedCount}/3`);
    matches.forEach(m => {
      if (m.matched) {
        console.log(`      ✓ ${m.type}`);
        console.log(`        Matched: "${m.matchedText?.substring(0, 100)}..."`);
      } else {
        console.log(`      ✗ ${m.type}`);
      }
    });

    return {
      announcementFolder,
      attachmentFile: fileName,
      fileSize,
      extractionMethod,
      extractionDuration: duration,
      textLength: extractedText.length,
      koreanCharPercentage: koreanPercentage,
      eligibilityMatches: {
        type1_CorporateResearchInstitute: type1,
        type2_CorporateDedicatedRnD: type2,
        // REMOVED Types 3-6 (November 10, 2025)
        // type3_Investment100to200M: type3,
        // type4_Investment300to500M: type4,
        // type5_Investment600Mto1B: type5,
        // type6_Investment1_1to2B: type6,
        type7_InnoBizOrVenture: type7,
      },
    };
  } catch (error: any) {
    console.error(`   ❌ ERROR: ${error.message}`);
    return null;
  }
}

/**
 * Find all announcement files in attachments directory
 */
function findAnnouncementFiles(): Array<{ folder: string; file: string; path: string }> {
  const files: Array<{ folder: string; file: string; path: string }> = [];

  // Read all date range folders (e.g., 20250401_to_20250430)
  const dateRangeFolders = fs.readdirSync(ATTACHMENTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const dateRangeFolder of dateRangeFolders) {
    const dateRangePath = path.join(ATTACHMENTS_DIR, dateRangeFolder);

    // Read all page folders (e.g., page-1, page-2)
    const pageFolders = fs.readdirSync(dateRangePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const pageFolder of pageFolders) {
      const pagePath = path.join(dateRangePath, pageFolder);

      // Read all announcement folders (e.g., announcement-1, announcement-2)
      const announcementFolders = fs.readdirSync(pagePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const announcementFolder of announcementFolders) {
        const announcementPath = path.join(pagePath, announcementFolder);

        // Read all files in announcement folder
        const announcementFiles = fs.readdirSync(announcementPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .filter(dirent => {
            const ext = path.extname(dirent.name).toLowerCase();
            return ext === '.hwp' || ext === '.hwpx' || ext === '.pdf';
          })
          .map(dirent => dirent.name);

        for (const file of announcementFiles) {
          files.push({
            folder: announcementPath,
            file: file,
            path: path.join(announcementPath, file),
          });
        }
      }
    }
  }

  return files;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  Eligibility Extraction R&D Script');
  console.log('═'.repeat(80));
  console.log('\n');

  const startTime = Date.now();

  // Find all announcement files
  console.log('📂 Scanning announcement files...');
  const allFiles = findAnnouncementFiles();
  console.log(`   Found ${allFiles.length} announcement files`);

  // Limit for initial testing
  const filesToProcess = allFiles.slice(0, MAX_FILES_TO_PROCESS);
  console.log(`   Processing ${filesToProcess.length} files (limit: ${MAX_FILES_TO_PROCESS})`);

  // Create shared browser for Hancom Tesseract fallback
  console.log('\n🌐 Creating shared browser session for Hancom Docs...');
  const sharedBrowser = await createAuthenticatedHancomBrowser();
  console.log('   ✓ Browser ready');

  // Process files
  const results: ExtractionResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < filesToProcess.length; i++) {
    const { folder, file, path: filePath } = filesToProcess[i];

    console.log(`\n[${ i + 1}/${filesToProcess.length}]`);

    const result = await processAnnouncementFile(filePath, file, folder, sharedBrowser);

    if (result) {
      results.push(result);
      if (result.textLength > 0) {
        successCount++;
      } else {
        failCount++;
      }
    } else {
      failCount++;
    }
  }

  // Close browser
  console.log('\n🌐 Closing shared browser...');
  await sharedBrowser.close();
  console.log('   ✓ Browser closed');

  // Calculate summary statistics
  const summary: Summary = {
    totalFilesProcessed: filesToProcess.length,
    successfulExtractions: successCount,
    failedExtractions: failCount,
    extractionMethodBreakdown: {
      pyhwp: results.filter(r => r.extractionMethod === 'pyhwp').length,
      hancomTesseract: results.filter(r => r.extractionMethod === 'hancom-tesseract').length,
      pdfParse: results.filter(r => r.extractionMethod === 'pdf-parse').length,
      failed: results.filter(r => r.extractionMethod === 'failed').length,
    },
    eligibilityTypeMatches: {
      type1_CorporateResearchInstitute: results.filter(r => r.eligibilityMatches.type1_CorporateResearchInstitute.matched).length,
      type2_CorporateDedicatedRnD: results.filter(r => r.eligibilityMatches.type2_CorporateDedicatedRnD.matched).length,
      // REMOVED Types 3-6 (November 10, 2025)
      // type3_Investment100to200M: results.filter(r => r.eligibilityMatches.type3_Investment100to200M.matched).length,
      // type4_Investment300to500M: results.filter(r => r.eligibilityMatches.type4_Investment300to500M.matched).length,
      // type5_Investment600Mto1B: results.filter(r => r.eligibilityMatches.type5_Investment600Mto1B.matched).length,
      // type6_Investment1_1to2B: results.filter(r => r.eligibilityMatches.type6_Investment1_1to2B.matched).length,
      type7_InnoBizOrVenture: results.filter(r => r.eligibilityMatches.type7_InnoBizOrVenture.matched).length,
    },
    processingTime: Date.now() - startTime,
  };

  // Save results to JSON
  console.log('\n💾 Saving results to JSON...');
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    summary,
    results,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`   ✓ Saved to: ${OUTPUT_FILE}`);
  console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);

  // Print summary
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('  Summary');
  console.log('═'.repeat(80));
  console.log('\n');
  console.log(`Total Files Processed:       ${summary.totalFilesProcessed}`);
  console.log(`Successful Extractions:      ${summary.successfulExtractions} (${((summary.successfulExtractions / summary.totalFilesProcessed) * 100).toFixed(1)}%)`);
  console.log(`Failed Extractions:          ${summary.failedExtractions} (${((summary.failedExtractions / summary.totalFilesProcessed) * 100).toFixed(1)}%)`);
  console.log('\n');
  console.log('Extraction Method Breakdown:');
  console.log(`  pyhwp:                     ${summary.extractionMethodBreakdown.pyhwp}`);
  console.log(`  Hancom Tesseract:          ${summary.extractionMethodBreakdown.hancomTesseract}`);
  console.log(`  PDF Parse:                 ${summary.extractionMethodBreakdown.pdfParse}`);
  console.log(`  Failed:                    ${summary.extractionMethodBreakdown.failed}`);
  console.log('\n');
  console.log('Eligibility Type Matches:');
  console.log(`  Type 1 (기업부설연구소):        ${summary.eligibilityTypeMatches.type1_CorporateResearchInstitute}`);
  console.log(`  Type 2 (연구개발전담부서):       ${summary.eligibilityTypeMatches.type2_CorporateDedicatedRnD}`);
  console.log(`  Type 7 (INNO-BIZ/벤처):       ${summary.eligibilityTypeMatches.type7_InnoBizOrVenture}`);
  console.log('\n  ❌ REMOVED (November 10, 2025) - 100% false positive rate:');
  console.log(`     Type 3 (1-2억원 Investment)`);
  console.log(`     Type 4 (3-5억원 Investment)`);
  console.log(`     Type 5 (6-10억원 Investment)`);
  console.log(`     Type 6 (11-20억원 Investment)`);
  console.log('\n');
  console.log(`Processing Time:             ${(summary.processingTime / 1000).toFixed(2)}s`);
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('\n');
  console.log('✅ Script completed successfully!');
  console.log(`📊 Review results: ${OUTPUT_FILE}`);
  console.log('\n');
}

// Run
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
