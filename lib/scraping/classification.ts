/**
 * Centralized Announcement Classification System
 *
 * Purpose: Classify government funding announcements into categories:
 * - R_D_PROJECT: Actual R&D funding opportunities (shown in matches)
 * - SURVEY: Technology demand surveys (hidden from matches)
 * - EVENT: Conferences, seminars, workshops (hidden from matches)
 * - NOTICE: General announcements, policy changes (hidden from matches)
 * - UNKNOWN: Unclassifiable (hidden from matches)
 *
 * Used by:
 * 1. All parsers (IITP, TIPA, KIMST, NTIS) during scraping
 * 2. Retroactive classification script for existing database records
 */

import type { AnnouncementType } from '@prisma/client';

interface ClassificationInput {
  title: string;
  description?: string;
  url: string;
  source?: 'iitp' | 'tipa' | 'kimst' | 'ntis' | 'ntis_api' | null;
}

/**
 * Classify an announcement based on title, description, URL, and source
 *
 * @param input - Announcement data to classify
 * @returns AnnouncementType enum value
 *
 * Classification Logic:
 * 1. Source-specific URL patterns (highest priority)
 * 2. Keyword matching in title and description
 * 3. Default to R_D_PROJECT for ambiguous cases
 */
export function classifyAnnouncement(input: ClassificationInput): AnnouncementType {
  const { title, description = '', url, source } = input;

  // DEBUG: Log all inputs
  if (process.env.DEBUG_CLASSIFICATION) {
    console.log('\n[CLASSIFICATION] ═══════════════════════════════════════');
    console.log('[CLASSIFICATION] Function called with:');
    console.log(`[CLASSIFICATION]   Title: "${title}"`);
    console.log(`[CLASSIFICATION]   Description length: ${description.length} chars`);
    console.log(`[CLASSIFICATION]   Description preview: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"`);
    console.log(`[CLASSIFICATION]   URL: ${url}`);
    console.log(`[CLASSIFICATION]   Source: ${source}`);
  }

  // ================================================================
  // PRIORITY 1: Source-Specific URL Pattern Detection
  // ================================================================

  // IITP: Type 1 URLs (/anno/01/) are always technology demand surveys
  if (source === 'iitp' && url.includes('/anno/01/')) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ Matched IITP survey URL pattern → SURVEY');
    }
    return 'SURVEY';
  }

  // ================================================================
  // PRIORITY 2: TITLE-PRIORITY R&D DETECTION (Highest Priority)
  // ================================================================
  // CRITICAL FIX (2025-11-11): Check title FIRST before exclusion patterns
  //
  // PROBLEM IDENTIFIED (v2 - Execution Order Bug):
  // - Previous fix added title-priority logic, but exclusion patterns still ran FIRST
  // - Exclusion patterns checked combinedText (title + description) before title-priority R&D check
  // - Example: "에너지인력양성사업 연구개발과제" contains both "인력" (exclusion) and "연구개발과제" (R&D)
  // - Bug: Exclusion pattern at line 61 triggered first → returned NOTICE (false negative)
  // - Fix: Move title R&D check to run BEFORE exclusion patterns
  //
  // SOLUTION:
  // 1. Check TITLE FIRST for R&D patterns (absolute highest priority)
  // 2. If title matches R&D → return R_D_PROJECT immediately (nothing can override)
  // 3. Then check exclusion patterns on description only (not combinedText)
  // 4. Finally check combinedText for R&D patterns as secondary check
  //
  // RATIONALE:
  // - Titles are carefully crafted by government agencies to describe program type
  // - If title clearly indicates R&D, it should override any exclusion patterns in description
  // - False negative (hiding real R&D) is worse than false positive (showing non-R&D)
  //
  // Keywords: 연구과제 (research project), 과제공고 (project announcement),
  //           R&D (research & development), 지원사업 (support program),
  //           기술개발 (technology development)
  const rdProjectPatterns = [
    /연구과제/,           // Research project
    /과제\s*공고/,        // Project announcement (with optional space)
    /과제선정/,           // Project selection
    /신규\s*과제/,        // New project (e.g., "신규과제 공고")
    /연구개발/,           // Research & Development
    /R&D/i,               // R&D (case insensitive, with ampersand)
    /\bRD\b/i,            // RD (case insensitive, without ampersand, word boundary)
    /지원사업/,           // Support program
    /기술개발/,           // Technology development
    /개발과제/,           // Development project
    /연구지원/,           // Research support
    /사업화\s*지원/,      // Commercialization support
    /프로젝트.*공고/,     // Project announcement (e.g., "플래그십 프로젝트 공고")
    /연구.*사업/,         // Research...program (e.g., "연구역량강화사업", "기초과학연구사업")
    /과학.*연구/,         // Science...research (e.g., "과학연구", "기초과학연구")
    /신규\s*지원/,        // New support (e.g., "신규지원")
    /연구센터.*조성/,     // Research center establishment
    /창업기업.*지원/,     // Startup support program (e.g., "TIPS 창업기업 지원계획")
  ];

  // STEP 1: Check title first (ABSOLUTE highest priority - runs before everything)
  const titleLower = title.toLowerCase();

  if (process.env.DEBUG_CLASSIFICATION) {
    console.log('[CLASSIFICATION] Step 1: Checking title for R&D patterns...');
    console.log(`[CLASSIFICATION]   titleLower: "${titleLower}"`);

    // Check each pattern individually for debugging
    const matchedPatterns = rdProjectPatterns.filter(pattern => pattern.test(titleLower));
    if (matchedPatterns.length > 0) {
      console.log(`[CLASSIFICATION]   ✓ Title matched ${matchedPatterns.length} R&D pattern(s):`);
      matchedPatterns.forEach(pattern => {
        console.log(`[CLASSIFICATION]     - ${pattern.source}`);
      });
    } else {
      console.log(`[CLASSIFICATION]   ✗ Title did NOT match any R&D patterns`);
    }
  }

  if (rdProjectPatterns.some(pattern => pattern.test(titleLower))) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ Title-priority R&D detection → R_D_PROJECT');
    }
    return 'R_D_PROJECT';
  }

  // ================================================================
  // PRIORITY 3: EXCLUSION PATTERNS (Check description only)
  // ================================================================
  // These identify non-R&D programs that contain R&D-like keywords
  // NOTE: Only check description, NOT title (title already checked above)
  // NOTE: Only check description, NOT combinedText (prevents overriding title-based classification)

  const descriptionLower = description.toLowerCase();

  if (process.env.DEBUG_CLASSIFICATION) {
    console.log('[CLASSIFICATION] Step 2: Checking description for exclusion patterns...');
    console.log(`[CLASSIFICATION]   descriptionLower length: ${descriptionLower.length} chars`);
  }

  // --- Exclusion 1: Personnel Dispatch Programs ---
  // Example: "연구인력지원사업(파견)" = Research personnel support (dispatch)
  // These are workforce programs, NOT R&D funding opportunities
  if (/인력.*파견|파견.*인력/.test(descriptionLower)) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ Matched personnel dispatch pattern → NOTICE');
    }
    return 'NOTICE';
  }

  // --- Exclusion 2: Award/Excellence/Recognition Programs ---
  // Example: "R&D 우수성과 50선 모집" = R&D excellence top 50 recruitment
  // These recruit for awards/recognition, NOT R&D funding
  if (/(우수성과|시상|수상|포상).*(모집|선정)/.test(descriptionLower)) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ Matched award/excellence pattern → EVENT');
    }
    return 'EVENT';
  }

  // --- Exclusion 3: Consortium/Alliance Member Recruitment ---
  // Example: "K-휴머노이드 연합 신규 구성원 추가 모집" = Recruiting consortium members
  // These recruit members for alliances, NOT R&D funding applicants
  if (/(연합|컨소시엄).*(구성원|참여기업|참여기관).*(모집|선정)/.test(descriptionLower)) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ Matched consortium recruitment pattern → NOTICE');
    }
    return 'NOTICE';
  }

  // --- Exclusion 4: Recommendation List Recruitment ---
  // Example: "중소기업 R&D 전담은행 투자지원 추천기업 모집" = Recruiting companies for recommendation
  // These recruit for lists/recommendations, NOT R&D funding
  if (/추천기업.*모집|추천.*모집/.test(descriptionLower)) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ Matched recommendation recruitment pattern → NOTICE');
    }
    return 'NOTICE';
  }

  if (process.env.DEBUG_CLASSIFICATION) {
    console.log('[CLASSIFICATION]   ✗ No exclusion patterns matched');
  }

  // ================================================================
  // PRIORITY 4: Combined Text R&D Detection (Secondary)
  // ================================================================
  // Check combinedText for R&D patterns if title didn't match

  const combinedText = `${title} ${description}`.toLowerCase();

  if (process.env.DEBUG_CLASSIFICATION) {
    console.log('[CLASSIFICATION] Step 3: Checking combinedText for R&D patterns...');
    console.log(`[CLASSIFICATION]   combinedText length: ${combinedText.length} chars`);

    const matchedPatterns = rdProjectPatterns.filter(pattern => pattern.test(combinedText));
    if (matchedPatterns.length > 0) {
      console.log(`[CLASSIFICATION]   ✓ CombinedText matched ${matchedPatterns.length} R&D pattern(s):`);
      matchedPatterns.forEach(pattern => {
        console.log(`[CLASSIFICATION]     - ${pattern.source}`);
      });
    } else {
      console.log(`[CLASSIFICATION]   ✗ CombinedText did NOT match any R&D patterns`);
    }
  }

  if (rdProjectPatterns.some(pattern => pattern.test(combinedText))) {
    if (process.env.DEBUG_CLASSIFICATION) {
      console.log('[CLASSIFICATION] ✓ CombinedText R&D detection → R_D_PROJECT');
    }
    return 'R_D_PROJECT';
  }

  // --- SURVEY Detection ---
  // Keywords: 수요조사 (demand survey), 설문 (questionnaire),
  //           의견수렴 (opinion gathering), 참여기업모집 (participant recruitment)
  // NOTE: This check runs AFTER R&D detection to avoid misclassifying R&D programs
  // that mention surveys/recruitment as part of the application process.
  const surveyPatterns = [
    /수요조사/,           // Demand survey
    /설문/,               // Questionnaire/survey
    /의견수렴/,           // Opinion gathering
    /참여기업\s*모집/,    // Participant company recruitment
    /참여기업모집/,       // (without space)
    /기술수요/,           // Technology demand
  ];

  if (surveyPatterns.some(pattern => pattern.test(combinedText))) {
    return 'SURVEY';
  }

  // --- EVENT Detection ---
  // Keywords: 설명회 (briefing), 세미나 (seminar), 행사 (event),
  //           워크샵 (workshop), 컨퍼런스 (conference)
  // NOTE: This check runs AFTER R&D detection to avoid misclassifying R&D programs
  // that mention briefings/info sessions as events.
  const eventPatterns = [
    /설명회/,             // Briefing/info session
    /세미나/,             // Seminar
    /행사/,               // Event
    /워크샵/,             // Workshop
    /컨퍼런스/,           // Conference
    /간담회/,             // Meeting/consultation
    /발표회/,             // Presentation
  ];

  if (eventPatterns.some(pattern => pattern.test(combinedText))) {
    return 'EVENT';
  }

  // --- NOTICE Detection ---
  // Keywords: 공지 (notice), 안내 (announcement), 변경사항 (changes), 일정변경 (schedule change)
  // Note: Use ^ for start-of-string to avoid false positives (e.g., "사업안내" is actually R&D project)
  const noticePatterns = [
    /^공지/,              // Notice (at start of title)
    /시행계획\s*안내/,    // Implementation plan announcement
    /시행계획\s*공고/,    // Implementation plan announcement (공고 variant)
    /추진계획/,           // Promotion/implementation plan
    /실행계획/,           // Execution plan
    /주요업무\s*추진계획/, // Key task implementation plan
    /과제\s*추진/,        // Project implementation (not announcement)
    /변경사항/,           // Changes
    /일정변경/,           // Schedule change
    /연기/,               // Postponement
    /온라인.*시스템.*안내/, // Online system guidelines (e.g., JAMS)
    /제출.*시스템/,       // Submission system
    /입찰.*공고/,         // Bid announcement (procurement, not R&D)
    /용역.*입찰/,         // Service bidding
    /정책연구.*입찰/,     // Policy research bidding (procurement)
  ];

  // Special case: Titles ending with "안내" (announcement) are often general notices
  // Example: "2025년도 제1차 한국무역보험공사 연계 수출지원프로그램 시행계획 안내"
  if (title.trim().endsWith('안내')) {
    // But exclude if it contains strong R&D keywords (e.g., "R&D 지원사업 안내")
    const hasStrongRdKeywords = /연구과제|과제공고|R&D\s*지원사업|기술개발\s*지원/.test(combinedText);
    if (!hasStrongRdKeywords) {
      return 'NOTICE';
    }
  }

  if (noticePatterns.some(pattern => pattern.test(combinedText))) {
    if (process.env.DEBUG_CLASSIFICATION) {
      const matchedPatterns = noticePatterns.filter(pattern => pattern.test(combinedText));
      console.log(`[CLASSIFICATION] ✓ Matched ${matchedPatterns.length} notice pattern(s):`);
      matchedPatterns.forEach(pattern => {
        console.log(`[CLASSIFICATION]     - ${pattern.source}`);
      });
      console.log('[CLASSIFICATION] Result: NOTICE');
    }
    return 'NOTICE';
  }

  // ================================================================
  // PRIORITY 5: Default Classification
  // ================================================================

  // Default to R_D_PROJECT for ambiguous cases
  // Rationale: Government funding platforms primarily host R&D funding opportunities
  // False positive (showing non-R&D as R&D) is better than false negative (hiding real R&D)
  // Users can manually filter out non-R&D matches, but can't recover hidden opportunities
  if (process.env.DEBUG_CLASSIFICATION) {
    console.log('[CLASSIFICATION] No patterns matched → defaulting to R_D_PROJECT');
  }
  return 'R_D_PROJECT';
}

/**
 * Batch classify multiple announcements
 *
 * @param inputs - Array of announcements to classify
 * @returns Array of classifications in same order as input
 */
export function classifyAnnouncementBatch(inputs: ClassificationInput[]): AnnouncementType[] {
  return inputs.map(classifyAnnouncement);
}

/**
 * Get classification statistics for debugging/reporting
 *
 * @param inputs - Array of announcements to analyze
 * @returns Object with counts for each announcement type
 */
export function getClassificationStats(inputs: ClassificationInput[]): Record<AnnouncementType, number> {
  const stats: Record<AnnouncementType, number> = {
    R_D_PROJECT: 0,
    SURVEY: 0,
    EVENT: 0,
    NOTICE: 0,
    UNKNOWN: 0,
  };

  inputs.forEach(input => {
    const type = classifyAnnouncement(input);
    stats[type]++;
  });

  return stats;
}
