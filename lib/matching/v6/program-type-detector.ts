import { funding_programs } from '@prisma/client';
import { ProgramApplicationType } from './types';

const DESIGNATED_PATTERNS = [/지정과제/, /지정공모/, /위탁과제/];
const DEMAND_SURVEY_PATTERNS = [/수요조사/, /기획조사/, /의견수렴/, /수요발굴/];
const INSTITUTIONAL_ONLY_PATTERNS = [/출연\(연\)/, /연구회\s*소관/, /정부출연연/];

export function detectProgramApplicationType(
  program: Pick<funding_programs, 'title' | 'description'>
): ProgramApplicationType {
  const title = program.title || '';
  const description = program.description || '';
  const combined = `${title} ${description}`;

  if (DESIGNATED_PATTERNS.some(pattern => pattern.test(combined))) {
    return 'DESIGNATED';
  }

  if (DEMAND_SURVEY_PATTERNS.some(pattern => pattern.test(combined))) {
    return 'DEMAND_SURVEY';
  }

  if (INSTITUTIONAL_ONLY_PATTERNS.some(pattern => pattern.test(combined))) {
    return 'INSTITUTIONAL_ONLY';
  }

  if (!program.title && !program.description) {
    return 'UNKNOWN';
  }

  return 'OPEN_COMPETITION';
}

export function isConsolidatedAnnouncement(program: Pick<funding_programs, 'deadline' | 'applicationStart' | 'budgetAmount'>): boolean {
  return !program.deadline && !program.applicationStart && !program.budgetAmount;
}
