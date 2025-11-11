/**
 * Eligibility Extraction Module with Database Integration
 *
 * Purpose: Extract eligibility criteria from NTIS announcements and save to database
 *
 * This module:
 * 1. Extracts 4 certification types using V2 patterns (proven in retry script)
 * 2. Determines `requiresResearchInstitute` flag
 * 3. Updates `funding_programs` table with eligibility data
 * 4. Creates audit trail in `eligibility_verification` table
 *
 * Used by: scripts/scrape-ntis-processor.ts
 */

import { db } from '@/lib/db';

// ============================================================
// Types
// ============================================================

export interface EligibilityExtractionResult {
  requiredCertifications: Array<'DCP' | 'RDC' | 'VENTURE' | 'INNO_BIZ'>;
  requiresResearchInstitute: boolean;
  eligibilityConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  extractionDetails: {
    DCP?: { matched: boolean; matchedText?: string; pattern?: string };
    RDC?: { matched: boolean; matchedText?: string; pattern?: string };
    VENTURE?: { matched: boolean; matchedText?: string; pattern?: string };
    INNO_BIZ?: { matched: boolean; matchedText?: string; pattern?: string };
    RESEARCH_INSTITUTE?: { matched: boolean; matchedText?: string; pattern?: string };
  };
  extractedFrom: 'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE' | 'BOTH';
  extractedText?: string;
}

interface EligibilityMatch {
  matched: boolean;
  matchedText?: string;
  pattern?: string;
}

// ============================================================
// V2 Pattern Extraction Functions (from proven retry script)
// ============================================================

/**
 * Extract 기업부설연구소 (DCP - Dedicated Corporate research lab / Certified Research Center)
 */
function extractDCP(text: string): EligibilityMatch {
  const patterns = [
    /기업부설연구소.*?인정.*?기업/gi,
    /기업부설연구소.*?설치.*?기업/gi,
    /연구소.*?인정.*?기업/gi,
    /기업부설연구소/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return { matched: false };
}

/**
 * Extract 연구개발전담부서 (RDC - R&D Dedicated Department)
 */
function extractRDC(text: string): EligibilityMatch {
  const patterns = [
    /연구개발전담부서.*?인정.*?기업/gi,
    /연구개발전담부서.*?설치.*?기업/gi,
    /연구.*?전담.*?부서.*?인정/gi,
    /연구개발전담부서/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return { matched: false };
}

/**
 * Extract 벤처기업 (Venture Company Certification)
 */
function extractVenture(text: string): EligibilityMatch {
  const patterns = [
    /벤처기업.*?인증/gi,
    /벤처기업.*?확인/gi,
    /벤처기업/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return { matched: false };
}

/**
 * Extract INNO-BIZ Certification
 */
function extractInnoBiz(text: string): EligibilityMatch {
  const patterns = [
    /이노비즈.*?기업/gi,
    /INNO-BIZ.*?기업/gi,
    /이노비즈/gi,
    /INNO-BIZ/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return { matched: false };
}

/**
 * Detect if program requires research institute participation (consortium requirement)
 *
 * Common patterns:
 * - "대학·연구기관 의무 참여"
 * - "연구기관 참여 필수"
 * - "산학연 컨소시엄"
 * - "협동연구기관"
 */
function requiresResearchInstituteParticipation(text: string): EligibilityMatch {
  const patterns = [
    /대학.*?연구기관.*?의무.*?참여/gi,
    /연구기관.*?참여.*?필수/gi,
    /연구기관.*?의무/gi,
    /산학연.*?컨소시엄/gi,
    /협동연구기관/gi,
    /공동연구.*?대학/gi,
    /공동연구.*?연구소/gi,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        matched: true,
        matchedText: match[0],
        pattern: pattern.source,
      };
    }
  }

  return { matched: false };
}

// ============================================================
// Main Extraction Function
// ============================================================

/**
 * Extract eligibility criteria from announcement text
 *
 * @param announcementText - Combined text from announcement files
 * @param detailPageText - Fallback text from detail page (rawHtml + description)
 * @returns Extraction result with certification types and research institute requirement
 */
export function extractEligibilityCriteria(
  announcementText: string,
  detailPageText: string
): EligibilityExtractionResult {
  // Priority 1: Announcement files (if available)
  const primaryText = announcementText.trim().length > 0 ? announcementText : detailPageText;
  const extractedFrom: 'ANNOUNCEMENT_FILE' | 'DETAIL_PAGE' | 'BOTH' =
    announcementText.trim().length > 0 && detailPageText.trim().length > 0
      ? 'BOTH'
      : announcementText.trim().length > 0
      ? 'ANNOUNCEMENT_FILE'
      : 'DETAIL_PAGE';

  // Extract all certification types
  const dcpMatch = extractDCP(primaryText);
  const rdcMatch = extractRDC(primaryText);
  const ventureMatch = extractVenture(primaryText);
  const innoBizMatch = extractInnoBiz(primaryText);
  const researchInstituteMatch = requiresResearchInstituteParticipation(primaryText);

  // Build requiredCertifications array
  const requiredCertifications: Array<'DCP' | 'RDC' | 'VENTURE' | 'INNO_BIZ'> = [];
  if (dcpMatch.matched) requiredCertifications.push('DCP');
  if (rdcMatch.matched) requiredCertifications.push('RDC');
  if (ventureMatch.matched) requiredCertifications.push('VENTURE');
  if (innoBizMatch.matched) requiredCertifications.push('INNO_BIZ');

  // Determine eligibility confidence
  // HIGH: Found at least one certification or research institute requirement
  // MEDIUM: Text length > 1000 chars but no matches (explicit "no requirements" case)
  // LOW: Text length < 1000 chars (insufficient data)
  let eligibilityConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (requiredCertifications.length > 0 || researchInstituteMatch.matched) {
    eligibilityConfidence = 'HIGH';
  } else if (primaryText.length > 1000) {
    eligibilityConfidence = 'MEDIUM'; // No requirements found, but text is sufficient
  }

  return {
    requiredCertifications,
    requiresResearchInstitute: researchInstituteMatch.matched,
    eligibilityConfidence,
    extractionDetails: {
      DCP: dcpMatch.matched ? dcpMatch : undefined,
      RDC: rdcMatch.matched ? rdcMatch : undefined,
      VENTURE: ventureMatch.matched ? ventureMatch : undefined,
      INNO_BIZ: innoBizMatch.matched ? innoBizMatch : undefined,
      RESEARCH_INSTITUTE: researchInstituteMatch.matched ? researchInstituteMatch : undefined,
    },
    extractedFrom,
    extractedText: primaryText.substring(0, 5000), // Save first 5000 chars for debugging
  };
}

// ============================================================
// Database Integration Functions
// ============================================================

/**
 * Save eligibility extraction result to database
 *
 * Updates:
 * 1. funding_programs table: requiredCertifications, requiresResearchInstitute, eligibilityConfidence
 * 2. eligibility_verification table: Audit trail entry
 *
 * @param programId - Funding program ID
 * @param result - Extraction result
 * @param sourceFilenames - List of attachment filenames used for extraction
 */
export async function saveEligibilityToDatabase(
  programId: string,
  result: EligibilityExtractionResult,
  sourceFilenames: string[] = []
): Promise<void> {
  try {
    // Update funding_programs table
    await db.funding_programs.update({
      where: { id: programId },
      data: {
        requiredCertifications: result.requiredCertifications,
        requiresResearchInstitute: result.requiresResearchInstitute,
        // @ts-ignore - eligibilityConfidence added via migration but not yet in Prisma types
        eligibilityConfidence: result.eligibilityConfidence,
      },
    });

    // Build extraction notes (combines extraction details and text sample)
    const extractionDetails = Object.entries(result.extractionDetails)
      .filter(([_, match]) => match && match.matched)
      .map(([type, match]) => `${type}: "${match!.matchedText}" (pattern: ${match!.pattern})`)
      .join('; ');

    const extractionNotes = [
      extractionDetails || 'No certification patterns matched',
      result.extractedText ? `Text sample (first 500 chars): ${result.extractedText.substring(0, 500)}...` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    // Create audit trail in eligibility_verification table
    await db.eligibility_verification.create({
      data: {
        programId, // Field name matches schema (not fundingProgramId)
        requiredCertifications: result.requiredCertifications, // Field name matches schema
        requiresResearchInstitute: result.requiresResearchInstitute,
        confidence: result.eligibilityConfidence, // Field name matches schema (not extractionConfidence)
        extractionMethod:
          result.extractedFrom === 'ANNOUNCEMENT_FILE'
            ? 'V2_PATTERNS_ANNOUNCEMENT'
            : result.extractedFrom === 'DETAIL_PAGE'
            ? 'V2_PATTERNS_DETAIL_PAGE'
            : 'V2_PATTERNS_BOTH',
        sourceFiles: sourceFilenames,
        extractionNotes, // Combines extraction details + text sample
        verified: false, // Default: unverified until manually reviewed
        verifiedAt: null,
      },
    });

    console.log(
      `   ✓ Eligibility saved: ${result.requiredCertifications.join(', ') || 'No certifications'}, ` +
        `Research Institute Required: ${result.requiresResearchInstitute}, ` +
        `Confidence: ${result.eligibilityConfidence}`
    );
  } catch (error: any) {
    console.error(`   ⚠️  Failed to save eligibility to database: ${error.message}`);
    throw error;
  }
}

/**
 * Extract and save eligibility criteria (convenience function)
 *
 * Combines extraction + database save in one call for use in processor worker
 *
 * @param programId - Funding program ID
 * @param announcementText - Text from announcement files
 * @param detailPageText - Text from detail page (fallback)
 * @param sourceFilenames - List of attachment filenames used for extraction
 */
export async function extractAndSaveEligibility(
  programId: string,
  announcementText: string,
  detailPageText: string,
  sourceFilenames: string[] = []
): Promise<EligibilityExtractionResult> {
  const result = extractEligibilityCriteria(announcementText, detailPageText);
  await saveEligibilityToDatabase(programId, result, sourceFilenames);
  return result;
}
