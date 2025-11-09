/**
 * Separate Eligibility Extraction & Verification Script
 *
 * Purpose: Extract eligibility data from existing programs and store in verification table
 * for iterative improvement without affecting production matching.
 *
 * Key Features:
 * 1. Independent of scraper - uses already-scraped data (attachments, detail pages)
 * 2. Separate storage - writes to eligibility_verification table (not funding_programs)
 * 3. Comparison mode - can compare new extraction vs current production data
 * 4. Iterative refinement - run multiple times to test extraction improvements
 *
 * Usage:
 *   npx tsx scripts/extract-eligibility-verification.ts [options]
 *
 * Options:
 *   --program-id <id>       Extract single program by ID
 *   --date-range <days>     Extract programs scraped in last N days (default: 30)
 *   --compare               Compare extraction with current funding_programs data
 *   --limit <n>             Limit to N programs (default: all)
 *   --confidence <level>    Only extract programs with current confidence <= level (LOW/MEDIUM/HIGH)
 *
 * Examples:
 *   # Extract all programs from last 30 days
 *   npx tsx scripts/extract-eligibility-verification.ts
 *
 *   # Extract and compare single program
 *   npx tsx scripts/extract-eligibility-verification.ts --program-id abc123 --compare
 *
 *   # Extract 100 low-confidence programs
 *   npx tsx scripts/extract-eligibility-verification.ts --limit 100 --confidence LOW
 */

import { db } from '@/lib/db';
import { ConfidenceLevel } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { extractTextFromAttachment } from '@/lib/scraping/utils/attachment-parser';

// ============================================================================
// EXTRACTION FUNCTIONS (Simplified versions of scraper extraction logic)
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
 * Extract certifications from text
 */
function extractCertifications(text: string): {
  required: string[];
  preferred: string[];
} {
  const required: string[] = [];
  const preferred: string[] = [];

  // Required certification patterns
  const requiredPatterns = [
    { keyword: '벤처기업', pattern: /벤처기업\s*(인증|확인서|필수|요구)/ },
    { keyword: 'INNO-BIZ', pattern: /INNO-?BIZ\s*(인증|필수|요구)/ },
    { keyword: '연구개발전담부서', pattern: /연구개발전담부서\s*(인증|설치|필수)/ },
    { keyword: '기업부설연구소', pattern: /기업부설연구소\s*(인정|설치|필수|요구)/ },
    { keyword: '중소기업', pattern: /중소기업\s*(확인서|필수|한정)/ },
  ];

  // Preferred certification patterns (우대)
  const preferredPatterns = [
    { keyword: '벤처기업', pattern: /벤처기업\s*(우대|가점)/ },
    { keyword: 'INNO-BIZ', pattern: /INNO-?BIZ\s*(우대|가점)/ },
    { keyword: '메인비즈', pattern: /메인비즈|Main-?Biz/ },
    { keyword: 'ISO 인증', pattern: /ISO\s*\d+\s*(인증|우대)/ },
  ];

  // Extract required certifications
  for (const { keyword, pattern } of requiredPatterns) {
    if (pattern.test(text)) {
      required.push(keyword);
    }
  }

  // Extract preferred certifications
  for (const { keyword, pattern } of preferredPatterns) {
    if (pattern.test(text) && !required.includes(keyword)) {
      preferred.push(keyword);
    }
  }

  return { required, preferred };
}

/**
 * Extract employee count constraints
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
 * Extract revenue constraints
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
 * Extract investment requirement
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
 * Extract operating years requirement
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
 * Extract research institute requirement
 */
function extractResearchInstituteRequirement(text: string): {
  required: boolean;
  notes: string[];
} {
  const notes: string[] = [];

  // Required patterns
  const requiredPatterns = [
    /기업부설연구소\s*(?:인정서|설치|필수)/,
    /연구전담부서\s*(?:인정서|설치|필수)/,
    /연구소\s*보유\s*(?:필수|기업)/,
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
 * Main extraction function
 *
 * Updated to read actual attachment files from file system using scraping_jobs metadata
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

      // Construct file path (container path, not host path)
      // In production: /app/data/scraper/ntis-attachments/{attachmentFolder}/{filename}
      // In development: ./data/scraper/ntis-attachments/{attachmentFolder}/{filename}
      const isProduction = process.env.NODE_ENV === 'production';
      const baseDir = isProduction ? '/app/data/scraper' : './data/scraper';
      const filePath = join(baseDir, 'ntis-attachments', attachmentFolder, filename);

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

  // Extract certifications
  const { required: reqCerts, preferred: prefCerts } = extractCertifications(extractionText);
  result.requiredCertifications = reqCerts;
  result.preferredCertifications = prefCerts;

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

  // Extract research institute requirement
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
// COMPARISON FUNCTIONS
// ============================================================================

interface ComparisonResult {
  matchesCurrentData: boolean;
  improvementDetected: boolean;
  comparisonNotes: string;
}

function compareWithCurrentData(
  extracted: EligibilityExtractionResult,
  current: {
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
    eligibilityConfidence: ConfidenceLevel;
  }
): ComparisonResult {
  const diffs: string[] = [];

  // Compare certifications
  const reqCertsMatch =
    JSON.stringify(extracted.requiredCertifications.sort()) ===
    JSON.stringify(current.requiredCertifications.sort());
  if (!reqCertsMatch) {
    diffs.push(
      `Required certs: [${current.requiredCertifications.join(', ')}] → [${extracted.requiredCertifications.join(', ')}]`
    );
  }

  const prefCertsMatch =
    JSON.stringify(extracted.preferredCertifications.sort()) ===
    JSON.stringify(current.preferredCertifications.sort());
  if (!prefCertsMatch) {
    diffs.push(
      `Preferred certs: [${current.preferredCertifications.join(', ')}] → [${extracted.preferredCertifications.join(', ')}]`
    );
  }

  // Compare employee constraints
  if (extracted.requiredMinEmployees !== current.requiredMinEmployees) {
    diffs.push(
      `Min employees: ${current.requiredMinEmployees} → ${extracted.requiredMinEmployees}`
    );
  }
  if (extracted.requiredMaxEmployees !== current.requiredMaxEmployees) {
    diffs.push(
      `Max employees: ${current.requiredMaxEmployees} → ${extracted.requiredMaxEmployees}`
    );
  }

  // Compare revenue
  if (extracted.requiredMinRevenue?.toString() !== current.requiredMinRevenue?.toString()) {
    diffs.push(`Min revenue changed`);
  }
  if (extracted.requiredMaxRevenue?.toString() !== current.requiredMaxRevenue?.toString()) {
    diffs.push(`Max revenue changed`);
  }

  // Compare investment amount
  if (extracted.requiredInvestmentAmount?.toString() !== current.requiredInvestmentAmount?.toString()) {
    diffs.push(`Investment amount changed`);
  }

  // Compare operating years
  if (extracted.requiredOperatingYears !== current.requiredOperatingYears) {
    diffs.push(
      `Min operating years: ${current.requiredOperatingYears} → ${extracted.requiredOperatingYears}`
    );
  }
  if (extracted.maxOperatingYears !== current.maxOperatingYears) {
    diffs.push(
      `Max operating years: ${current.maxOperatingYears} → ${extracted.maxOperatingYears}`
    );
  }

  // Compare research institute
  if (extracted.requiresResearchInstitute !== current.requiresResearchInstitute) {
    diffs.push(
      `Research institute: ${current.requiresResearchInstitute} → ${extracted.requiresResearchInstitute}`
    );
  }

  const matchesCurrentData = diffs.length === 0;

  // Detect improvements: higher confidence or more fields extracted
  const currentFieldCount = [
    current.requiredCertifications.length > 0,
    current.preferredCertifications.length > 0,
    current.requiredMinEmployees !== null,
    current.requiredMaxEmployees !== null,
    current.requiredMinRevenue !== null,
    current.requiredMaxRevenue !== null,
    current.requiredInvestmentAmount !== null,
    current.requiredOperatingYears !== null,
    current.maxOperatingYears !== null,
    current.requiresResearchInstitute,
  ].filter(Boolean).length;

  const newFieldCount = [
    extracted.requiredCertifications.length > 0,
    extracted.preferredCertifications.length > 0,
    extracted.requiredMinEmployees !== null,
    extracted.requiredMaxEmployees !== null,
    extracted.requiredMinRevenue !== null,
    extracted.requiredMaxRevenue !== null,
    extracted.requiredInvestmentAmount !== null,
    extracted.requiredOperatingYears !== null,
    extracted.maxOperatingYears !== null,
    extracted.requiresResearchInstitute,
  ].filter(Boolean).length;

  const confidenceImproved =
    (extracted.confidence === 'HIGH' && current.eligibilityConfidence !== 'HIGH') ||
    (extracted.confidence === 'MEDIUM' && current.eligibilityConfidence === 'LOW');

  const improvementDetected = newFieldCount > currentFieldCount || confidenceImproved;

  let comparisonNotes = '';
  if (matchesCurrentData) {
    comparisonNotes = '✅ Matches current data exactly';
  } else {
    comparisonNotes = `📝 ${diffs.length} differences detected:\n${diffs.map(d => `  - ${d}`).join('\n')}`;
  }

  if (improvementDetected) {
    comparisonNotes += `\n🎯 Improvement: ${currentFieldCount} → ${newFieldCount} fields`;
    if (confidenceImproved) {
      comparisonNotes += ` | Confidence: ${current.eligibilityConfidence} → ${extracted.confidence}`;
    }
  }

  return {
    matchesCurrentData,
    improvementDetected,
    comparisonNotes,
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const programId = args.find((arg, i) => args[i - 1] === '--program-id');
  const daysBack = parseInt(args.find((arg, i) => args[i - 1] === '--date-range') || '30', 10);
  const compareMode = args.includes('--compare');
  const limit = parseInt(args.find((arg, i) => args[i - 1] === '--limit') || '0', 10);
  const confidenceFilter = (args.find((arg, i) => args[i - 1] === '--confidence') || null) as ConfidenceLevel | null;

  console.log('🔍 Eligibility Extraction & Verification Script\n');
  console.log('Configuration:');
  if (programId) {
    console.log(`  - Program ID: ${programId}`);
  } else {
    console.log(`  - Date range: Last ${daysBack} days`);
    if (limit > 0) console.log(`  - Limit: ${limit} programs`);
    if (confidenceFilter) console.log(`  - Confidence filter: <= ${confidenceFilter}`);
  }
  console.log(`  - Comparison mode: ${compareMode ? 'ENABLED' : 'DISABLED'}\n`);

  // Build query
  const where: any = {};

  if (programId) {
    where.id = programId;
  } else {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);
    where.scrapedAt = { gte: dateThreshold };

    if (confidenceFilter) {
      const confidenceLevels: ConfidenceLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
      const filterIndex = confidenceLevels.indexOf(confidenceFilter);
      where.eligibilityConfidence = { in: confidenceLevels.slice(0, filterIndex + 1) };
    }
  }

  // Fetch programs with scraping_jobs metadata for file access
  const programs = await db.funding_programs.findMany({
    where,
    select: {
      id: true,
      title: true,
      requiredCertifications: true,
      preferredCertifications: true,
      requiredMinEmployees: true,
      requiredMaxEmployees: true,
      requiredMinRevenue: true,
      requiredMaxRevenue: true,
      requiredInvestmentAmount: true,
      requiredOperatingYears: true,
      maxOperatingYears: true,
      requiresResearchInstitute: true,
      eligibilityConfidence: true,
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
  let improved = 0;
  let matched = 0;

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

    // Extract eligibility data
    const extracted = await extractEligibilityFromProgram(
      program.id,
      program.title,
      attachmentFolder,
      attachmentFilenames
    );

    console.log(`  Confidence: ${extracted.confidence} | Method: ${extracted.extractionMethod} | Notes: ${extracted.extractionNotes.length}`);

    // Compare with current data if enabled
    let comparison: ComparisonResult | null = null;
    if (compareMode) {
      comparison = compareWithCurrentData(extracted, program);
      console.log(`  ${comparison.comparisonNotes.split('\n')[0]}`);

      if (comparison.matchesCurrentData) matched++;
      if (comparison.improvementDetected) improved++;
    }

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
        matchesCurrentData: comparison?.matchesCurrentData ?? null,
        improvementDetected: comparison?.improvementDetected ?? null,
        comparisonNotes: comparison?.comparisonNotes ?? null,
      },
    });

    created++;
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 EXTRACTION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Processed: ${processed} programs`);
  console.log(`Created: ${created} verification records`);
  if (compareMode) {
    console.log(`Matched: ${matched} (${((matched / processed) * 100).toFixed(1)}%)`);
    console.log(`Improved: ${improved} (${((improved / processed) * 100).toFixed(1)}%)`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await db.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
