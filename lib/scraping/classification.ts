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

  // ================================================================
  // PRIORITY 1: Source-Specific URL Pattern Detection
  // ================================================================

  // IITP: Type 1 URLs (/anno/01/) are always technology demand surveys
  if (source === 'iitp' && url.includes('/anno/01/')) {
    return 'SURVEY';
  }

  // ================================================================
  // PRIORITY 2: EXCLUSION PATTERNS (Check BEFORE regular patterns)
  // ================================================================
  // These identify non-R&D programs that contain R&D-like keywords
  // CRITICAL: These run FIRST to prevent false R&D classifications

  // Combine title and description for comprehensive text analysis
  // Note: 25% of programs have empty descriptions, so title is critical
  const combinedText = `${title} ${description}`.toLowerCase();

  // --- Exclusion 1: Personnel Dispatch Programs ---
  // Example: "연구인력지원사업(파견)" = Research personnel support (dispatch)
  // These are workforce programs, NOT R&D funding opportunities
  if (/인력.*파견|파견.*인력/.test(combinedText)) {
    return 'NOTICE';
  }

  // --- Exclusion 2: Award/Excellence/Recognition Programs ---
  // Example: "R&D 우수성과 50선 모집" = R&D excellence top 50 recruitment
  // These recruit for awards/recognition, NOT R&D funding
  if (/(우수성과|시상|수상|포상).*(모집|선정)/.test(combinedText)) {
    return 'EVENT';
  }

  // --- Exclusion 3: Consortium/Alliance Member Recruitment ---
  // Example: "K-휴머노이드 연합 신규 구성원 추가 모집" = Recruiting consortium members
  // These recruit members for alliances, NOT R&D funding applicants
  if (/(연합|컨소시엄).*(구성원|참여기업|참여기관).*(모집|선정)/.test(combinedText)) {
    return 'NOTICE';
  }

  // --- Exclusion 4: Recommendation List Recruitment ---
  // Example: "중소기업 R&D 전담은행 투자지원 추천기업 모집" = Recruiting companies for recommendation
  // These recruit for lists/recommendations, NOT R&D funding
  if (/추천기업.*모집|추천.*모집/.test(combinedText)) {
    return 'NOTICE';
  }

  // ================================================================
  // PRIORITY 3: Keyword Matching (Case-Insensitive)
  // ================================================================

  // --- R&D PROJECT Detection (CHECK THIS FIRST!) ---
  // CRITICAL FIX (2025-11-08): Moved BEFORE SURVEY detection to prevent misclassification
  // IMPORTANT: R&D detection must run BEFORE SURVEY detection to prevent false negatives.
  // Many R&D announcements mention surveys/participant recruitment as part of the process
  // (e.g., "기술개발 사업 참여기업 모집"), but they are legitimate R&D funding opportunities.
  //
  // Keywords: 연구과제 (research project), 과제공고 (project announcement),
  //           R&D (research & development), 지원사업 (support program),
  //           기술개발 (technology development)
  const rdProjectPatterns = [
    /연구과제/,           // Research project
    /과제공고/,           // Project announcement
    /과제선정/,           // Project selection
    /연구개발/,           // Research & Development
    /R&D/i,               // R&D (case insensitive)
    /지원사업/,           // Support program
    /기술개발/,           // Technology development
    /개발과제/,           // Development project
    /연구지원/,           // Research support
    /사업화\s*지원/,      // Commercialization support
  ];

  if (rdProjectPatterns.some(pattern => pattern.test(combinedText))) {
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
    return 'NOTICE';
  }

  // ================================================================
  // PRIORITY 3: Default Classification
  // ================================================================

  // Default to R_D_PROJECT for ambiguous cases
  // Rationale: Government funding platforms primarily host R&D funding opportunities
  // False positive (showing non-R&D as R&D) is better than false negative (hiding real R&D)
  // Users can manually filter out non-R&D matches, but can't recover hidden opportunities
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
