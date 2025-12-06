/**
 * Profile Completion Calculator
 *
 * Calculates the completion percentage of an organization profile
 * based on fields important for matching and competitiveness.
 */

import { organizations } from '@prisma/client';

// Fields to check for profile completion with their weights
const PROFILE_FIELDS: Array<{
  field: keyof organizations;
  label: string;
  weight: number;
  checkEmpty: (value: any) => boolean;
}> = [
  // Basic Info (30%)
  {
    field: 'industrySector',
    label: '산업 분야',
    weight: 10,
    checkEmpty: (v) => !v,
  },
  {
    field: 'employeeCount',
    label: '직원 수',
    weight: 10,
    checkEmpty: (v) => !v,
  },
  {
    field: 'description',
    label: '조직 설명',
    weight: 10,
    checkEmpty: (v) => !v || v.trim() === '',
  },

  // Eligibility Fields (40%)
  {
    field: 'revenueRange',
    label: '매출 규모',
    weight: 10,
    checkEmpty: (v) => !v,
  },
  {
    field: 'businessStructure',
    label: '사업자 유형',
    weight: 10,
    checkEmpty: (v) => !v,
  },
  {
    field: 'certifications',
    label: '보유 인증',
    weight: 10,
    checkEmpty: (v) => !v || (Array.isArray(v) && v.length === 0),
  },
  {
    field: 'technologyReadinessLevel',
    label: '기술 준비 수준 (TRL)',
    weight: 10,
    checkEmpty: (v) => v === null || v === undefined,
  },

  // R&D Info (20%)
  {
    field: 'rdExperience',
    label: 'R&D 경험',
    weight: 5,
    checkEmpty: (v) => v === null || v === undefined,
  },
  {
    field: 'hasResearchInstitute',
    label: '기업부설연구소',
    weight: 5,
    checkEmpty: (v) => v === null || v === undefined,
  },
  {
    field: 'keyTechnologies',
    label: '핵심 기술',
    weight: 10,
    checkEmpty: (v) => !v || (Array.isArray(v) && v.length === 0),
  },
  {
    field: 'researchFocusAreas',
    label: '연구 분야',
    weight: 10,
    checkEmpty: (v) => !v || (Array.isArray(v) && v.length === 0),
  },

  // Track Record (10%)
  {
    field: 'priorGrantWins',
    label: '정부과제 수행실적',
    weight: 5,
    checkEmpty: (v) => v === null || v === undefined,
  },
  {
    field: 'patentCount',
    label: '보유 특허',
    weight: 5,
    checkEmpty: (v) => v === null || v === undefined,
  },
];

export interface ProfileCompletionResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: Array<{ field: string; label: string }>;
}

/**
 * Calculate profile completion percentage
 */
export function calculateProfileCompletion(
  org: Partial<organizations>
): ProfileCompletionResult {
  let totalWeight = 0;
  let completedWeight = 0;
  const missingFields: Array<{ field: string; label: string }> = [];

  for (const fieldConfig of PROFILE_FIELDS) {
    totalWeight += fieldConfig.weight;

    const value = org[fieldConfig.field];
    const isEmpty = fieldConfig.checkEmpty(value);

    if (isEmpty) {
      missingFields.push({
        field: fieldConfig.field,
        label: fieldConfig.label,
      });
    } else {
      completedWeight += fieldConfig.weight;
    }
  }

  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return {
    percentage,
    completedCount: PROFILE_FIELDS.length - missingFields.length,
    totalCount: PROFILE_FIELDS.length,
    missingFields,
  };
}
