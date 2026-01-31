import { funding_programs } from '@prisma/client';
import { ProgramApplicationType } from './types';

/**
 * Program Application Type Detector (v6.0)
 *
 * Detects program types that should be filtered from matching:
 * - DESIGNATED: Pre-assigned projects (지정과제, 위탁과제) — not open competition
 * - DEMAND_SURVEY: Surveys for future programs (수요조사) — not applications
 * - INSTITUTIONAL_ONLY: Restricted to government research institutes (출연연)
 * - CONSOLIDATED: Umbrella announcements (통합공고) — lack actionable details
 * - OPEN_COMPETITION: Regular programs anyone can apply to
 *
 * Title patterns are derived from analysis of 450+ NTIS announcements (2025-2026).
 */

const DESIGNATED_PATTERNS = [
  /지정과제/,    // Designated project
  /지정공모/,    // Designated call
  /위탁과제/,    // Commissioned project
  /위탁연구/,    // Commissioned research (but check for R&D context)
  /선정과제/,    // Pre-selected project
];

const DEMAND_SURVEY_PATTERNS = [
  /수요조사/,    // Demand survey
  /기획조사/,    // Planning survey
  /의견수렴/,    // Opinion gathering
  /수요발굴/,    // Demand discovery
  /수요파악/,    // Demand assessment
  /의견조회/,    // Opinion inquiry
];

const INSTITUTIONAL_ONLY_PATTERNS = [
  /출연\(연\)/,       // Government-funded research institute
  /연구회\s*소관/,     // Under research council jurisdiction
  /정부출연연/,        // Government-funded institute
  /출연연구기관/,      // Funded research institution
  /기관전용/,          // Institution-only
];

/**
 * Detect the application type of a funding program.
 *
 * Uses title + description patterns to classify how the program accepts applicants.
 * This is a matching-pipeline filter only — programs remain in the database
 * regardless of classification.
 */
export function detectProgramApplicationType(
  program: Pick<funding_programs, 'title' | 'description'>
): ProgramApplicationType {
  const title = program.title || '';
  const description = program.description || '';
  const combined = `${title} ${description}`;

  // DESIGNATED: Pre-assigned, not open competition
  if (DESIGNATED_PATTERNS.some(pattern => pattern.test(combined))) {
    // Exception: '위탁연구' in context of CRO services is legitimate
    // Only block if no strong R&D context keywords present
    if (/위탁연구/.test(combined) && /과제공모|기술개발|연구개발/.test(combined)) {
      // Has R&D context — treat as OPEN_COMPETITION
    } else {
      return 'DESIGNATED';
    }
  }

  // DEMAND_SURVEY: Surveys, not actual applications
  if (DEMAND_SURVEY_PATTERNS.some(pattern => pattern.test(combined))) {
    return 'DEMAND_SURVEY';
  }

  // INSTITUTIONAL_ONLY: Government research institutes only
  if (INSTITUTIONAL_ONLY_PATTERNS.some(pattern => pattern.test(combined))) {
    return 'INSTITUTIONAL_ONLY';
  }

  if (!program.title && !program.description) {
    return 'UNKNOWN';
  }

  return 'OPEN_COMPETITION';
}

/**
 * Detect consolidated announcements (통합공고).
 *
 * Consolidated announcements are umbrella postings that reference external
 * websites for individual project details. They lack critical application
 * details (deadline, applicationStart, budget).
 *
 * Detection: All three critical fields are missing.
 */
export function isConsolidatedAnnouncement(
  program: Pick<funding_programs, 'deadline' | 'applicationStart' | 'budgetAmount'>
): boolean {
  return !program.deadline && !program.applicationStart && !program.budgetAmount;
}
