/**
 * SME24 Code Mapper
 *
 * Maps between Connect platform enums/values and SME24 API codes.
 * Used for eligibility checking and matching score calculation.
 *
 * SME24 Code Reference:
 * - Company Scale: CC10 (중소기업), CC30 (소상공인), CC50 (중견기업), CC60 (창업기업)
 * - Revenue: SI01-SI07 (5억미만 ~ 300억이상)
 * - Employees: EI01-EI06 (1~5명미만 ~ 100명이상)
 * - Business Age: OI01-OI06 (3년미만 ~ 15년이상)
 * - Certifications: EC01-EC10 (여성기업, 이노비즈, 벤처기업 등)
 * - Regions: 1000 (전국) ~ 3900 (제주)
 */

import {
  CompanyScaleType,
  RevenueRange,
  EmployeeCountRange,
  KoreanRegion,
} from '@prisma/client';
import {
  COMPANY_SCALE_CODES,
  SALES_AMOUNT_CODES,
  EMPLOYEE_COUNT_CODES,
  BUSINESS_AGE_CODES,
  CERTIFICATION_CODES,
  REGION_CODES,
} from '../types';

// ============================================================================
// Company Scale Mapping
// ============================================================================

/**
 * Map Connect CompanyScaleType to SME24 company scale code
 */
export function mapCompanyScaleToCode(scale: CompanyScaleType | null): string | null {
  if (!scale) return null;

  const mapping: Record<CompanyScaleType, string> = {
    STARTUP: 'CC60',        // 창업기업 (업력 7년 이내)
    SME: 'CC10',            // 중소기업
    MID_SIZED: 'CC50',      // 중견기업
    LARGE_ENTERPRISE: '',   // 대기업 - NOT eligible for SME programs
  };

  return mapping[scale] || null;
}

/**
 * Map SME24 company scale code to CompanyScaleType
 */
export function mapCodeToCompanyScale(code: string): CompanyScaleType | null {
  const mapping: Record<string, CompanyScaleType> = {
    CC10: 'SME',
    CC30: 'SME',            // 소상공인 → SME
    CC50: 'MID_SIZED',
    CC60: 'STARTUP',
  };

  return mapping[code] || null;
}

// ============================================================================
// Revenue Range Mapping
// ============================================================================

/**
 * Map Connect RevenueRange to SME24 sales amount code
 */
export function mapRevenueToCode(revenue: RevenueRange | null): string | null {
  if (!revenue) return null;

  const mapping: Record<RevenueRange, string> = {
    NONE: '',              // No revenue - new company
    UNDER_1B: 'SI01',      // 5억미만 (Connect UNDER_1B < 1B)
    FROM_1B_TO_10B: 'SI02',// 5억~10억
    FROM_10B_TO_50B: 'SI04',// 20억~50억
    FROM_50B_TO_100B: 'SI05',// 50억~100억
    OVER_100B: 'SI06',     // 100억~300억
  };

  return mapping[revenue] || null;
}

/**
 * Check if organization revenue matches program requirement
 */
export function checkRevenueEligibility(
  orgRevenue: RevenueRange | null,
  programCodes: string[]
): { eligible: boolean; reason: string } {
  // No requirement - eligible
  if (programCodes.length === 0) {
    return { eligible: true, reason: '매출액 제한 없음' };
  }

  // No org data - cannot verify
  if (!orgRevenue) {
    return { eligible: false, reason: '매출액 정보 필요' };
  }

  const orgCode = mapRevenueToCode(orgRevenue);
  if (!orgCode) {
    return { eligible: false, reason: '매출액 정보 매핑 실패' };
  }

  const eligible = programCodes.includes(orgCode);
  return {
    eligible,
    reason: eligible ? '매출액 조건 충족' : '매출액 조건 미충족',
  };
}

// ============================================================================
// Employee Count Mapping
// ============================================================================

/**
 * Map Connect EmployeeCountRange to SME24 employee count code
 */
export function mapEmployeeCountToCode(range: EmployeeCountRange | null): string | null {
  if (!range) return null;

  const mapping: Record<EmployeeCountRange, string> = {
    UNDER_10: 'EI01',      // 1~5명미만 (closest match)
    FROM_10_TO_50: 'EI04', // 20~50명미만
    FROM_50_TO_100: 'EI05',// 50~100명미만
    FROM_100_TO_300: 'EI06',// 100명이상
    OVER_300: 'EI06',      // 100명이상
  };

  return mapping[range] || null;
}

/**
 * Get approximate employee count from range
 */
export function getEmployeeCountMidpoint(range: EmployeeCountRange | null): number | null {
  if (!range) return null;

  const mapping: Record<EmployeeCountRange, number> = {
    UNDER_10: 5,
    FROM_10_TO_50: 30,
    FROM_50_TO_100: 75,
    FROM_100_TO_300: 200,
    OVER_300: 500,
  };

  return mapping[range] || null;
}

// ============================================================================
// Business Age Mapping
// ============================================================================

/**
 * Calculate business age in years from establishment date
 */
export function calculateBusinessAge(establishedDate: Date | null): number | null {
  if (!establishedDate) return null;

  const now = new Date();
  const years = now.getFullYear() - establishedDate.getFullYear();
  const monthDiff = now.getMonth() - establishedDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < establishedDate.getDate())) {
    return years - 1;
  }

  return years;
}

/**
 * Map business age (years) to SME24 code
 */
export function mapBusinessAgeToCode(years: number | null): string | null {
  if (years === null) return null;

  if (years < 3) return 'OI01';      // 3년미만
  if (years < 5) return 'OI02';      // 3~5년
  if (years < 7) return 'OI03';      // 5~7년
  if (years < 10) return 'OI04';     // 7~10년
  if (years < 15) return 'OI05';     // 10~15년
  return 'OI06';                      // 15년이상
}

// ============================================================================
// Certification Mapping
// ============================================================================

/**
 * Certification name variations to SME24 code mapping
 */
const CERT_NAME_TO_CODE: Record<string, string> = {
  // InnoBiz
  '이노비즈': 'EC06',
  'INNO-BIZ': 'EC06',
  'INNOBIZ': 'EC06',
  '기술혁신형중소기업': 'EC06',

  // MainBiz
  '메인비즈': 'EC07',
  'MAIN-BIZ': 'EC07',
  'MAINBIZ': 'EC07',
  '경영혁신형중소기업': 'EC07',

  // Venture
  '벤처기업': 'EC08',
  'VENTURE': 'EC08',
  '벤처': 'EC08',

  // Other certifications
  '여성기업': 'EC01',
  '장애인기업': 'EC02',
  '사회적기업': 'EC03',
  '녹색인증기업': 'EC04',
  '기업부설연구소': 'EC05',
  '가족친화기업': 'EC09',
  '고용우수기업': 'EC10',
};

/**
 * Map certification names to SME24 codes
 */
export function mapCertificationsToCode(certifications: string[]): string[] {
  return certifications
    .map(cert => {
      const upperCert = cert.toUpperCase();
      // Try exact match first
      if (CERT_NAME_TO_CODE[cert]) return CERT_NAME_TO_CODE[cert];
      // Try uppercase match
      const matchKey = Object.keys(CERT_NAME_TO_CODE).find(
        key => key.toUpperCase() === upperCert
      );
      return matchKey ? CERT_NAME_TO_CODE[matchKey] : null;
    })
    .filter((code): code is string => code !== null);
}

/**
 * Check if organization has required certifications
 */
export function checkCertificationEligibility(
  orgCertifications: string[],
  requiredCertCodes: string[]
): { eligible: boolean; missing: string[]; met: string[] } {
  // No requirement - eligible
  if (requiredCertCodes.length === 0) {
    return { eligible: true, missing: [], met: [] };
  }

  const orgCertCodes = mapCertificationsToCode(orgCertifications);
  const missing: string[] = [];
  const met: string[] = [];

  for (const requiredCode of requiredCertCodes) {
    if (orgCertCodes.includes(requiredCode)) {
      // Find human-readable name
      const certName = Object.entries(CERTIFICATION_CODES).find(
        ([code]) => code === requiredCode
      )?.[1] || requiredCode;
      met.push(certName);
    } else {
      const certName = Object.entries(CERTIFICATION_CODES).find(
        ([code]) => code === requiredCode
      )?.[1] || requiredCode;
      missing.push(certName);
    }
  }

  return {
    eligible: missing.length === 0,
    missing,
    met,
  };
}

// ============================================================================
// Region Mapping
// ============================================================================

/**
 * Map Connect KoreanRegion to SME24 region code
 */
export function mapRegionToCode(region: KoreanRegion): string {
  const mapping: Record<KoreanRegion, string> = {
    SEOUL: '1100',
    GYEONGGI: '3100',
    INCHEON: '2300',
    BUSAN: '2100',
    DAEGU: '2200',
    GWANGJU: '2400',
    DAEJEON: '2500',
    ULSAN: '2600',
    SEJONG: '2900',
    GANGWON: '3200',
    CHUNGBUK: '3300',
    CHUNGNAM: '3400',
    JEONBUK: '3500',
    JEONNAM: '3600',
    GYEONGBUK: '3700',
    GYEONGNAM: '3800',
    JEJU: '3900',
  };

  return mapping[region];
}

/**
 * Map SME24 region code to KoreanRegion
 */
export function mapCodeToRegion(code: string): KoreanRegion | null {
  const mapping: Record<string, KoreanRegion> = {
    '1100': 'SEOUL',
    '3100': 'GYEONGGI',
    '2300': 'INCHEON',
    '2100': 'BUSAN',
    '2200': 'DAEGU',
    '2400': 'GWANGJU',
    '2500': 'DAEJEON',
    '2600': 'ULSAN',
    '2900': 'SEJONG',
    '3200': 'GANGWON',
    '3300': 'CHUNGBUK',
    '3400': 'CHUNGNAM',
    '3500': 'JEONBUK',
    '3600': 'JEONNAM',
    '3700': 'GYEONGBUK',
    '3800': 'GYEONGNAM',
    '3900': 'JEJU',
  };

  return mapping[code] || null;
}

/**
 * Check if organization regions match program requirements
 */
export function checkRegionEligibility(
  orgRegions: KoreanRegion[],
  programRegionCodes: string[]
): { eligible: boolean; reason: string } {
  // No requirement or 전국 (nationwide) - eligible
  if (programRegionCodes.length === 0 || programRegionCodes.includes('1000')) {
    return { eligible: true, reason: '지역 제한 없음' };
  }

  // No org data - cannot verify
  if (orgRegions.length === 0) {
    return { eligible: false, reason: '소재지 정보 필요' };
  }

  const orgRegionCodes = orgRegions.map(mapRegionToCode);
  const hasMatch = programRegionCodes.some(code => orgRegionCodes.includes(code));

  return {
    eligible: hasMatch,
    reason: hasMatch ? '지역 조건 충족' : '지역 조건 미충족',
  };
}

// ============================================================================
// Export all mappings
// ============================================================================

export const CodeMapper = {
  // Company Scale
  mapCompanyScaleToCode,
  mapCodeToCompanyScale,

  // Revenue
  mapRevenueToCode,
  checkRevenueEligibility,

  // Employee Count
  mapEmployeeCountToCode,
  getEmployeeCountMidpoint,

  // Business Age
  calculateBusinessAge,
  mapBusinessAgeToCode,

  // Certifications
  mapCertificationsToCode,
  checkCertificationEligibility,

  // Regions
  mapRegionToCode,
  mapCodeToRegion,
  checkRegionEligibility,
};
