/**
 * Eligibility Extraction V2 - Improved Korean Government Document Parsing
 *
 * CRITICAL FIXES (Nov 10, 2025):
 *
 * Problem: V1 patterns fail on Korean government documents because:
 * 1. No whitespace in Korean text: "기업부설연구소를보유하고" (no spaces)
 * 2. Descriptive verbs, not keywords: "보유" (possess) vs "필수" (required)
 * 3. Narrative prose, not bullet points
 *
 * Solution: Section-based extraction with flexible patterns
 * 1. Extract eligibility sections first (지원대상, 신청자격, etc.)
 * 2. Use Korean grammatical particles (를/을, 이/가)
 * 3. Match descriptive verbs (보유, 인정, 확인, 해당)
 * 4. Context-aware extraction (within eligibility sections only)
 */

import { db } from '@/lib/db';
import { ConfidenceLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { extractTextFromAttachment } from '@/lib/scraping/utils/attachment-parser';

// ============================================================================
// IMPROVED EXTRACTION FUNCTIONS (V2)
// ============================================================================

interface EligibilityExtractionResult {
  requiredCertifications: string[];
  preferredCertifications: string[];
  requiredMinEmployees: number | null;
  requiredMaxEmployees: number | null;
  requiredMinRevenue: bigint | null;
  requiredMaxRevenue: bigint | null;
  requiredInvestmentAmount: Decimal | null;
  requiredOperatingYears: number | null;
  maxOperatingYears: number | null;
  requiresResearchInstitute: boolean;
  confidence: ConfidenceLevel;
  extractionMethod: string;
  sourceFiles: string[];
  extractionNotes: string[];
}

/**
 * Extract eligibility sections from text
 *
 * Korean government documents structure eligibility in sections with headers like:
 * - 지원대상 (Support Target)
 * - 신청자격 (Application Qualification)
 * - 신청요건 (Application Requirements)
 * - 참여요건 (Participation Requirements)
 */
function extractEligibilitySections(text: string): {
  sections: Array<{ header: string; content: string; startIndex: number }>;
  notes: string[];
} {
  const notes: string[] = [];
  const sections: Array<{ header: string; content: string; startIndex: number }> = [];

  // Section headers to look for
  const sectionHeaders = [
    '지원대상',
    '신청자격',
    '신청요건',
    '참여요건',
    '참여자격',
    '지원요건',
  ];

  for (const header of sectionHeaders) {
    // Find all occurrences of this header
    const regex = new RegExp(header, 'gi');
    const matches = [...text.matchAll(regex)];

    for (const match of matches) {
      const startIndex = match.index!;

      // Extract up to 2000 characters after the header
      // (most eligibility criteria are within 1000-2000 chars of the header)
      const content = text.substring(startIndex, startIndex + 2000);

      sections.push({
        header,
        content,
        startIndex
      });

      notes.push(`Found "${header}" section at position ${startIndex}`);
    }
  }

  // Sort sections by position in document
  sections.sort((a, b) => a.startIndex - b.startIndex);

  return { sections, notes };
}

/**
 * Extract certifications from text - V2 with improved Korean patterns
 *
 * Changes from V1:
 * 1. No whitespace requirement (\s* removed)
 * 2. Match Korean grammatical particles (를, 을, 이, 가, 의, 에)
 * 3. Descriptive verb matching (보유, 인정, 확인, 해당, 필요)
 * 4. Section-aware extraction (prioritize eligibility sections)
 */
function extractCertifications(text: string): {
  required: string[];
  preferred: string[];
  notes: string[];
} {
  const required: string[] = [];
  const preferred: string[] = [];
  const notes: string[] = [];

  // First, try to extract eligibility sections for better accuracy
  const { sections, notes: sectionNotes } = extractEligibilitySections(text);
  notes.push(...sectionNotes);

  // Use eligibility sections if available, otherwise use full text
  const searchText = sections.length > 0
    ? sections.map(s => s.content).join('\n')
    : text;

  if (sections.length > 0) {
    notes.push(`✓ Searching within ${sections.length} eligibility sections`);
  } else {
    notes.push(`⚠ No eligibility sections found, searching full text`);
  }

  // ============================================================================
  // REQUIRED CERTIFICATION PATTERNS (V2)
  // ============================================================================

  // Pattern explanation:
  // - No \s* (whitespace) requirement
  // - Matches Korean particles: [를을이가의에]?
  // - Matches descriptive verbs: (보유|인정|확인|해당|필수|요구|설치|필요)
  // - Optional suffix: (된|한|하고|하여|임|기업|자)?

  const requiredPatterns = [
    {
      keyword: '벤처기업',
      // Matches: "벤처기업인증", "벤처기업을확인", "벤처기업에해당"
      pattern: /벤처기업[를을이가의에]?(인증|확인서|확인|해당|필수|요구|필요)[된한하고하여임기업자]?/,
      description: 'Venture company certification'
    },
    {
      keyword: 'INNO-BIZ',
      // Matches: "INNO-BIZ인증", "이노비즈기업", "INNOBIZ확인"
      pattern: /(?:INNO-?BIZ|이노비즈)[를을이가의에]?(인증|확인|해당|필수|요구|기업)?/i,
      description: 'INNO-BIZ certification'
    },
    {
      keyword: '연구개발전담부서',
      // Matches: "연구개발전담부서를보유", "연구개발전담부서인정", "연구전담부서설치"
      pattern: /연구(?:개발)?전담부서[를을이가의에]?(인증|인정|설치|보유|필수|필요)[하고하여된임]?/,
      description: 'Dedicated R&D department'
    },
    {
      keyword: '기업부설연구소',
      // Matches: "기업부설연구소를보유", "기업부설연구소인정서", "기업부설연구소설치"
      pattern: /기업부설연구소[를을이가의에]?(인정|인증|설치|보유|필수|요구|필요)[서하고하여된임]?/,
      description: 'Corporate research institute'
    },
    {
      keyword: '중소기업',
      // Matches: "중소기업확인서", "중소기업에해당", "중소기업필수"
      pattern: /중소기업[를을이가의에]?(확인서|확인|해당|필수|한정|대상)[하고하여된임기업]?/,
      description: 'SME (Small and Medium Enterprise)'
    },
    {
      keyword: '기술혁신형중소기업',
      // Matches: "기술혁신형중소기업", "기술혁신형(INNO-BIZ)"
      pattern: /기술혁신형\s?중소기업/,
      description: 'Technology innovative SME'
    },
    {
      keyword: 'DCP',
      // Matches: "DCP인증", "직접생산확인"
      pattern: /(?:DCP|직접생산확인)[를을이가의에]?(인증|확인|필수)?/,
      description: 'Direct Production Confirmation'
    },
  ];

  // ============================================================================
  // PREFERRED CERTIFICATION PATTERNS (V2)
  // ============================================================================

  const preferredPatterns = [
    {
      keyword: '벤처기업',
      // Matches: "벤처기업우대", "벤처기업가점"
      pattern: /벤처기업[를을이가의에]?(우대|가점|우선)[받|함]?/,
      description: 'Venture company (preferred)'
    },
    {
      keyword: 'INNO-BIZ',
      // Matches: "INNO-BIZ우대", "이노비즈가점"
      pattern: /(?:INNO-?BIZ|이노비즈)[를을이가의에]?(우대|가점|우선)/i,
      description: 'INNO-BIZ (preferred)'
    },
    {
      keyword: '메인비즈',
      // Matches: "메인비즈", "Main-Biz", "MAIN-BIZ"
      pattern: /(?:메인비즈|Main-?Biz)/i,
      description: 'Main-Biz certification'
    },
    {
      keyword: 'ISO 인증',
      // Matches: "ISO9001인증", "ISO 14001 우대"
      pattern: /ISO\s*\d+[를을이가의에]?(인증|우대|가점)?/,
      description: 'ISO certification'
    },
  ];

  // ============================================================================
  // EXTRACTION LOGIC
  // ============================================================================

  // Extract required certifications
  for (const { keyword, pattern, description } of requiredPatterns) {
    if (pattern.test(searchText)) {
      required.push(keyword);

      // Find the actual match for logging
      const match = searchText.match(pattern);
      if (match) {
        notes.push(`✓ Required: ${keyword} - matched "${match[0]}"`);
      }
    }
  }

  // Extract preferred certifications
  for (const { keyword, pattern, description } of preferredPatterns) {
    if (pattern.test(searchText) && !required.includes(keyword)) {
      preferred.push(keyword);

      // Find the actual match for logging
      const match = searchText.match(pattern);
      if (match) {
        notes.push(`✓ Preferred: ${keyword} - matched "${match[0]}"`);
      }
    }
  }

  // Additional heuristics for better accuracy

  // If "중소기업" is mentioned in context of "대상" but no other patterns match,
  // it's likely a general SME requirement
  if (required.length === 0 && /중소기업.{0,50}대상/.test(searchText)) {
    required.push('중소기업');
    notes.push('✓ Required: 중소기업 - inferred from "대상" context');
  }

  // If both 기업부설연구소 and 연구개발전담부서 are mentioned,
  // check if it's an OR condition (보유 or 인정)
  const hasResearchInstitute = /기업부설연구소[를을이가의에]?보유/.test(searchText);
  const hasRnDDept = /연구전담부서[를을이가의에]?보유/.test(searchText);

  if (hasResearchInstitute && hasRnDDept) {
    notes.push('ℹ Both research institute and R&D dept mentioned (likely OR condition)');
  }

  return { required, preferred, notes };
}

/**
 * Extract employee count constraints (unchanged from V1 - already works well)
 */
function extractEmployeeConstraints(text: string): {
  min: number | null;
  max: number | null;
  notes: string[];
} {
  const notes: string[] = [];
  let min: number | null = null;
  let max: number | null = null;

  // Pattern: "직원 수 X명 이상"
  const minPattern = /직원\s*(?:수|규모)?\s*(\d+)\s*명?\s*이상/;
  const minMatch = text.match(minPattern);
  if (minMatch) {
    min = parseInt(minMatch[1], 10);
    notes.push(`최소 직원 수: ${min}명`);
  }

  // Pattern: "직원 수 X명 이하"
  const maxPattern = /직원\s*(?:수|규모)?\s*(\d+)\s*명?\s*이하/;
  const maxMatch = text.match(maxPattern);
  if (maxMatch) {
    max = parseInt(maxMatch[1], 10);
    notes.push(`최대 직원 수: ${max}명`);
  }

  // Pattern: "X명 ~ Y명" or "X명 이상 Y명 이하"
  const rangePattern = /(\d+)\s*명?\s*(?:~|이상)\s*(\d+)\s*명?\s*(?:이하)?/;
  const rangeMatch = text.match(rangePattern);
  if (rangeMatch && !min && !max) {
    min = parseInt(rangeMatch[1], 10);
    max = parseInt(rangeMatch[2], 10);
    notes.push(`직원 수 범위: ${min}-${max}명`);
  }

  return { min, max, notes };
}

/**
 * Extract revenue constraints (unchanged from V1)
 */
function extractRevenueConstraints(text: string): {
  min: bigint | null;
  max: bigint | null;
  notes: string[];
} {
  const notes: string[] = [];
  let min: bigint | null = null;
  let max: bigint | null = null;

  // Pattern: "매출액 X억 이상"
  const minBillionPattern = /매출(?:액|규모)?\s*(\d+(?:,\d{3})*)\s*억\s*(?:원|원)?\s*이상/;
  const minBillionMatch = text.match(minBillionPattern);
  if (minBillionMatch) {
    const billions = parseInt(minBillionMatch[1].replace(/,/g, ''), 10);
    min = BigInt(billions) * BigInt(100_000_000);
    notes.push(`최소 매출액: ${billions}억원`);
  }

  // Pattern: "매출액 X억 이하"
  const maxBillionPattern = /매출(?:액|규모)?\s*(\d+(?:,\d{3})*)\s*억\s*(?:원|원)?\s*이하/;
  const maxBillionMatch = text.match(maxBillionPattern);
  if (maxBillionMatch) {
    const billions = parseInt(maxBillionMatch[1].replace(/,/g, ''), 10);
    max = BigInt(billions) * BigInt(100_000_000);
    notes.push(`최대 매출액: ${billions}억원`);
  }

  return { min, max, notes };
}

/**
 * Extract investment requirement (unchanged from V1)
 */
function extractInvestmentRequirement(text: string): {
  amount: Decimal | null;
  notes: string[];
} {
  const notes: string[] = [];

  // Pattern: "투자 유치 X억" or "X억 이상 투자"
  const investmentPattern = /(?:투자\s*유치|투자금|투자실적)\s*(\d+(?:,\d{3})*)\s*억/;
  const match = text.match(investmentPattern);

  if (match) {
    const billions = parseInt(match[1].replace(/,/g, ''), 10);
    const amount = new Decimal(billions).mul(100_000_000);
    notes.push(`투자 유치 실적: ${billions}억원 이상`);
    return { amount, notes };
  }

  // Common amounts: 2억, 5억, 10억, 20억, 50억
  const commonAmounts = [
    { pattern: /2억\s*(?:원|원)?\s*이상\s*투자/, amount: 200_000_000 },
    { pattern: /5억\s*(?:원|원)?\s*이상\s*투자/, amount: 500_000_000 },
    { pattern: /10억\s*(?:원|원)?\s*이상\s*투자/, amount: 1_000_000_000 },
  ];

  for (const { pattern, amount: amt } of commonAmounts) {
    if (pattern.test(text)) {
      notes.push(`투자 유치 실적: ${amt / 100_000_000}억원 이상`);
      return { amount: new Decimal(amt), notes };
    }
  }

  return { amount: null, notes };
}

/**
 * Extract operating years requirement (unchanged from V1)
 */
function extractOperatingYears(text: string): {
  min: number | null;
  max: number | null;
  notes: string[];
} {
  const notes: string[] = [];
  let min: number | null = null;
  let max: number | null = null;

  // Pattern: "업력 X년 이상" or "창업 X년 이상"
  const minPattern = /(?:업력|창업|설립)\s*(\d+)\s*년\s*이상/;
  const minMatch = text.match(minPattern);
  if (minMatch) {
    min = parseInt(minMatch[1], 10);
    notes.push(`최소 업력: ${min}년`);
  }

  // Pattern: "창업 X년 이내" (for startup programs)
  const maxPattern = /(?:창업|설립)\s*(\d+)\s*년\s*이내/;
  const maxMatch = text.match(maxPattern);
  if (maxMatch) {
    max = parseInt(maxMatch[1], 10);
    notes.push(`최대 업력: ${max}년 (창업기업 대상)`);
  }

  // Common constraint: "7년 이내 창업기업"
  if (/7년\s*이내\s*창업/.test(text)) {
    max = 7;
    notes.push('창업 7년 이내 기업 대상');
  }

  return { min, max, notes };
}

/**
 * Extract research institute requirement - V2 with improved patterns
 */
function extractResearchInstituteRequirement(text: string): {
  required: boolean;
  notes: string[];
} {
  const notes: string[] = [];

  // V2 patterns - match Korean grammatical particles and descriptive verbs
  const requiredPatterns = [
    /기업부설연구소[를을이가의에]?(?:인정서|인정|설치|보유)[하고하여된한]?/,
    /연구전담부서[를을이가의에]?(?:인정서|인정|설치|보유)[하고하여된한]?/,
    /연구소[를을이가의에]?보유[하고하여된한]?/,
    /연구개발전담부서[를을이가의에]?(?:인정|설치|보유)/,
  ];

  for (const pattern of requiredPatterns) {
    if (pattern.test(text)) {
      notes.push('기업부설연구소 또는 연구전담부서 보유 필수');
      return { required: true, notes };
    }
  }

  return { required: false, notes };
}

/**
 * Main extraction function - updated to use V2 functions
 */
async function extractEligibilityFromProgram(
  programId: string,
  programTitle: string,
  attachmentFolder: string | null,
  attachmentFilenames: string[]
): Promise<EligibilityExtractionResult> {
  const extractionNotes: string[] = [];
  let confidence: ConfidenceLevel = 'LOW';
  let extractionMethod = 'NONE';
  const sourceFiles: string[] = [];
  let combinedAnnouncementText = '';

  // Initialize result with defaults
  const result: EligibilityExtractionResult = {
    requiredCertifications: [],
    preferredCertifications: [],
    requiredMinEmployees: null,
    requiredMaxEmployees: null,
    requiredMinRevenue: null,
    requiredMaxRevenue: null,
    requiredInvestmentAmount: null,
    requiredOperatingYears: null,
    maxOperatingYears: null,
    requiresResearchInstitute: false,
    confidence,
    extractionMethod,
    sourceFiles,
    extractionNotes,
  };

  // ============================================================================
  // PRIORITY 1: Extract from announcement files (공고문)
  // ============================================================================

  if (attachmentFolder && attachmentFilenames.length > 0) {
    extractionNotes.push(`Found ${attachmentFilenames.length} attachments in ${attachmentFolder}`);

    for (const filename of attachmentFilenames) {
      // Skip non-announcement files (application forms, templates, execution plans, guides)
      if (/신청서|양식|집행계획|가이드/i.test(filename)) {
        extractionNotes.push(`Skipped: ${filename} (not an announcement file)`);
        continue;
      }

      // Construct file path with proper normalization
      let relativePath = attachmentFolder;

      // Strip absolute path prefixes if present
      if (relativePath.startsWith('/app/data/ntis-attachments/')) {
        relativePath = relativePath.replace('/app/data/ntis-attachments/', '');
      } else if (relativePath.startsWith('/app/data/scraper/ntis-attachments/')) {
        relativePath = relativePath.replace('/app/data/scraper/ntis-attachments/', '');
      } else if (relativePath.startsWith('data/ntis-attachments/')) {
        relativePath = relativePath.replace('data/ntis-attachments/', '');
      } else if (relativePath.startsWith('data/scraper/ntis-attachments/')) {
        relativePath = relativePath.replace('data/scraper/ntis-attachments/', '');
      }

      // Construct the correct absolute path
      const isProduction = process.env.NODE_ENV === 'production';
      const baseDir = isProduction ? '/app/data/scraper' : './data/scraper';
      const filePath = join(baseDir, 'ntis-attachments', relativePath, filename);

      try {
        // Check if file exists
        if (!existsSync(filePath)) {
          extractionNotes.push(`File not found: ${filename}`);
          continue;
        }

        // Read file buffer
        const fileBuffer = readFileSync(filePath);

        // Extract text using existing attachment parser
        const extractedText = await extractTextFromAttachment(filename, fileBuffer);

        if (extractedText && extractedText.length > 0) {
          combinedAnnouncementText += extractedText + '\n';
          sourceFiles.push(filename);
          extractionNotes.push(`✓ Extracted ${extractedText.length} chars from ${filename}`);
        } else {
          extractionNotes.push(`Failed to extract text from ${filename}`);
        }
      } catch (error: any) {
        extractionNotes.push(`Error reading ${filename}: ${error.message}`);
      }
    }

    // If we successfully extracted text from announcement files, use it
    if (combinedAnnouncementText.length > 0) {
      extractionMethod = 'ANNOUNCEMENT_FILE';
      extractionNotes.push(`✓ Total announcement text: ${combinedAnnouncementText.length} characters`);
    }
  } else {
    extractionNotes.push('No attachments available for extraction');
  }

  // ============================================================================
  // PRIORITY 2: Extract from program title and description (fallback)
  // ============================================================================

  // Use combined announcement text if available, otherwise fall back to title
  const extractionText = combinedAnnouncementText.length > 0 ? combinedAnnouncementText : programTitle;

  if (combinedAnnouncementText.length === 0) {
    extractionMethod = 'TITLE_ONLY';
    extractionNotes.push('⚠ Extracting from title only (no attachment text available)');
  }

  // ============================================================================
  // EXTRACTION USING V2 FUNCTIONS
  // ============================================================================

  // Extract certifications with V2 improved patterns
  const { required: reqCerts, preferred: prefCerts, notes: certNotes } = extractCertifications(extractionText);
  result.requiredCertifications = reqCerts;
  result.preferredCertifications = prefCerts;
  extractionNotes.push(...certNotes);

  // Extract employee constraints
  const { min: minEmp, max: maxEmp, notes: empNotes } = extractEmployeeConstraints(extractionText);
  result.requiredMinEmployees = minEmp;
  result.requiredMaxEmployees = maxEmp;
  extractionNotes.push(...empNotes);

  // Extract revenue constraints
  const { min: minRev, max: maxRev, notes: revNotes } = extractRevenueConstraints(extractionText);
  result.requiredMinRevenue = minRev;
  result.requiredMaxRevenue = maxRev;
  extractionNotes.push(...revNotes);

  // Extract investment requirement
  const { amount: invAmount, notes: invNotes } = extractInvestmentRequirement(extractionText);
  result.requiredInvestmentAmount = invAmount;
  extractionNotes.push(...invNotes);

  // Extract operating years
  const { min: minYears, max: maxYears, notes: yearsNotes } = extractOperatingYears(extractionText);
  result.requiredOperatingYears = minYears;
  result.maxOperatingYears = maxYears;
  extractionNotes.push(...yearsNotes);

  // Extract research institute requirement with V2 patterns
  const { required: researchReq, notes: researchNotes } = extractResearchInstituteRequirement(extractionText);
  result.requiresResearchInstitute = researchReq;
  extractionNotes.push(...researchNotes);

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  let fieldsExtracted = 0;
  if (result.requiredCertifications.length > 0 || result.preferredCertifications.length > 0) fieldsExtracted++;
  if (result.requiredMinEmployees !== null || result.requiredMaxEmployees !== null) fieldsExtracted++;
  if (result.requiredMinRevenue !== null || result.requiredMaxRevenue !== null) fieldsExtracted++;
  if (result.requiredInvestmentAmount !== null) fieldsExtracted++;
  if (result.requiredOperatingYears !== null || result.maxOperatingYears !== null) fieldsExtracted++;
  if (result.requiresResearchInstitute) fieldsExtracted++;

  // Confidence based on:
  // 1. Number of fields extracted
  // 2. Whether we had access to announcement files (higher confidence)
  if (extractionMethod === 'ANNOUNCEMENT_FILE') {
    if (fieldsExtracted >= 3) {
      result.confidence = 'HIGH';
    } else if (fieldsExtracted >= 2) {
      result.confidence = 'MEDIUM';
    } else {
      result.confidence = 'LOW';
    }
  } else {
    // Title-only extraction has lower confidence ceiling
    if (fieldsExtracted >= 4) {
      result.confidence = 'MEDIUM';
    } else {
      result.confidence = 'LOW';
    }
  }

  result.extractionMethod = extractionMethod;
  result.sourceFiles = sourceFiles;
  result.extractionNotes = extractionNotes;

  return result;
}

// ============================================================================
// MAIN EXECUTION (Same as V1)
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const programId = args.find((arg, i) => args[i - 1] === '--program-id');
  const daysBack = parseInt(args.find((arg, i) => args[i - 1] === '--date-range') || '30', 10);
  const limit = parseInt(args.find((arg, i) => args[i - 1] === '--limit') || '0', 10);

  console.log('🔍 Eligibility Extraction V2 - Improved Korean Document Parsing\n');
  console.log('Configuration:');
  if (programId) {
    console.log(`  - Program ID: ${programId}`);
  } else {
    console.log(`  - Date range: Last ${daysBack} days`);
    if (limit > 0) console.log(`  - Limit: ${limit} programs`);
  }
  console.log('');

  // Build query
  const where: any = {};

  if (programId) {
    where.id = programId;
  } else {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);
    where.scrapedAt = { gte: dateThreshold };
  }

  // Fetch programs with scraping_jobs metadata for file access
  const programs = await db.funding_programs.findMany({
    where,
    select: {
      id: true,
      title: true,
      scraping_job: {
        select: {
          attachmentFolder: true,
          attachmentFilenames: true,
          attachmentCount: true,
        },
      },
    },
    take: limit > 0 ? limit : undefined,
    orderBy: { scrapedAt: 'desc' },
  });

  console.log(`📊 Found ${programs.length} programs to process\n`);

  let processed = 0;
  let created = 0;
  let totalRequired = 0;
  let totalPreferred = 0;

  for (const program of programs) {
    processed++;
    console.log(`\n[${processed}/${programs.length}] ${program.title.substring(0, 80)}...`);

    // Extract attachment metadata from scraping_job
    const attachmentFolder = program.scraping_job?.attachmentFolder ?? null;
    const attachmentFilenames = program.scraping_job?.attachmentFilenames ?? [];
    const attachmentCount = program.scraping_job?.attachmentCount ?? 0;

    if (attachmentFolder && attachmentCount > 0) {
      console.log(`  📎 ${attachmentCount} attachments in ${attachmentFolder}`);
    } else {
      console.log(`  📎 No attachments available`);
    }

    // Extract eligibility data with V2
    const extracted = await extractEligibilityFromProgram(
      program.id,
      program.title,
      attachmentFolder,
      attachmentFilenames
    );

    console.log(`  Confidence: ${extracted.confidence} | Method: ${extracted.extractionMethod}`);
    console.log(`  Required Certs: [${extracted.requiredCertifications.join(', ')}]`);
    console.log(`  Preferred Certs: [${extracted.preferredCertifications.join(', ')}]`);

    if (extracted.requiredCertifications.length > 0) totalRequired++;
    if (extracted.preferredCertifications.length > 0) totalPreferred++;

    // Save to verification table
    await db.eligibility_verification.create({
      data: {
        programId: program.id,
        requiredCertifications: extracted.requiredCertifications,
        preferredCertifications: extracted.preferredCertifications,
        requiredMinEmployees: extracted.requiredMinEmployees,
        requiredMaxEmployees: extracted.requiredMaxEmployees,
        requiredMinRevenue: extracted.requiredMinRevenue,
        requiredMaxRevenue: extracted.requiredMaxRevenue,
        requiredInvestmentAmount: extracted.requiredInvestmentAmount,
        requiredOperatingYears: extracted.requiredOperatingYears,
        maxOperatingYears: extracted.maxOperatingYears,
        requiresResearchInstitute: extracted.requiresResearchInstitute,
        confidence: extracted.confidence,
        extractionMethod: extracted.extractionMethod,
        sourceFiles: extracted.sourceFiles,
        extractionNotes: extracted.extractionNotes.join('\n'),
        verified: false,
        matchesCurrentData: null,
        improvementDetected: null,
        comparisonNotes: null,
      },
    });

    created++;
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EXTRACTION SUMMARY (V2)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Processed: ${processed} programs`);
  console.log(`Created: ${created} verification records`);
  console.log(`Programs with required certs: ${totalRequired} (${((totalRequired / processed) * 100).toFixed(1)}%)`);
  console.log(`Programs with preferred certs: ${totalPreferred} (${((totalPreferred / processed) * 100).toFixed(1)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
