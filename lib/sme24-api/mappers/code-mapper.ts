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
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 6
 */
export function mapBusinessAgeToCode(years: number | null): string | null {
  if (years === null) return null;

  if (years < 3) return 'OI01';      // 3년미만
  if (years < 5) return 'OI02';      // 3년이상~5년미만
  if (years < 7) return 'OI03';      // 5년이상~7년미만
  if (years < 10) return 'OI04';     // 7년이상~10년미만
  if (years < 20) return 'OI05';     // 10년이상~20년미만 (Fixed: was <15)
  return 'OI06';                      // 20년이상 (Fixed: was 15년이상)
}

// ============================================================================
// Certification Mapping
// ============================================================================

/**
 * Certification name variations to SME24 code mapping
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 5-6
 */
const CERT_NAME_TO_CODE: Record<string, string> = {
  // EC01 - 수출유망중소기업
  '수출유망중소기업': 'EC01',
  '수출유망': 'EC01',

  // EC02 - 여성기업
  '여성기업': 'EC02',

  // EC03 - 장애인기업
  '장애인기업': 'EC03',

  // EC04 - 중소기업
  '중소기업': 'EC04',

  // EC05 - 소상공인
  '소상공인': 'EC05',

  // EC06 - 기술혁신형중소기업 (InnoBiz)
  '이노비즈': 'EC06',
  'INNO-BIZ': 'EC06',
  'INNOBIZ': 'EC06',
  '기술혁신형중소기업': 'EC06',

  // EC07 - 경영혁신형중소기업 (MainBiz)
  '메인비즈': 'EC07',
  'MAIN-BIZ': 'EC07',
  'MAINBIZ': 'EC07',
  '경영혁신형중소기업': 'EC07',

  // EC08 - 벤처기업
  '벤처기업': 'EC08',
  'VENTURE': 'EC08',
  '벤처': 'EC08',

  // EC09 - 우수그린비즈
  '우수그린비즈': 'EC09',
  '그린비즈': 'EC09',

  // EC10 - 사회적기업
  '사회적기업': 'EC10',

  // EC11 - 연구소보유
  '연구소보유': 'EC11',
  '기업부설연구소': 'EC11',

  // EC12 - 지식재산경영인증 기업
  '지식재산경영인증': 'EC12',
  '지식재산경영인증 기업': 'EC12',

  // EC13 - 부품소재기업
  '부품소재기업': 'EC13',

  // EC14 - 뿌리기술기업
  '뿌리기술기업': 'EC14',
  '뿌리기업': 'EC14',

  // EC15 - 에너지기술기업
  '에너지기술기업': 'EC15',

  // EC16 - 기술전문기업
  '기술전문기업': 'EC16',

  // EC17 - 직접생산확인기업
  '직접생산확인기업': 'EC17',
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
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 7-8
 */
export function mapRegionToCode(region: KoreanRegion): string {
  const mapping: Record<KoreanRegion, string> = {
    SEOUL: '1100',
    GYEONGGI: '4100',    // Fixed: was 3100
    INCHEON: '2800',     // Fixed: was 2300
    BUSAN: '2600',       // Fixed: was 2100
    DAEGU: '2700',       // Fixed: was 2200
    GWANGJU: '2900',     // Fixed: was 2400
    DAEJEON: '3000',     // Fixed: was 2500
    ULSAN: '3100',       // Fixed: was 2600
    SEJONG: '3611',      // Fixed: was 2900
    GANGWON: '4200',     // Fixed: was 3200
    CHUNGBUK: '4300',    // Fixed: was 3300
    CHUNGNAM: '4400',    // Fixed: was 3400
    JEONBUK: '4500',     // Fixed: was 3500
    JEONNAM: '4600',     // Fixed: was 3600
    GYEONGBUK: '4700',   // Fixed: was 3700
    GYEONGNAM: '4800',   // Fixed: was 3800
    JEJU: '5000',        // Fixed: was 3900
  };

  return mapping[region];
}

/**
 * Map SME24 region code to KoreanRegion
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 7-8
 *
 * NOTE: API returns 10-digit codes (행정표준코드), we handle both formats.
 */
export function mapCodeToRegion(code: string): KoreanRegion | null {
  // Normalize: convert 10-digit to 4-digit by taking first 4 chars
  const normalizedCode = code.length === 10 ? code.substring(0, 4) : code;

  const mapping: Record<string, KoreanRegion> = {
    '1100': 'SEOUL',
    '4100': 'GYEONGGI',
    '2800': 'INCHEON',
    '2600': 'BUSAN',
    '2700': 'DAEGU',
    '2900': 'GWANGJU',
    '3000': 'DAEJEON',
    '3100': 'ULSAN',
    '3611': 'SEJONG',
    '4200': 'GANGWON',
    '4300': 'CHUNGBUK',
    '4400': 'CHUNGNAM',
    '4500': 'JEONBUK',
    '4600': 'JEONNAM',
    '4700': 'GYEONGBUK',
    '4800': 'GYEONGNAM',
    '5000': 'JEJU',
  };

  return mapping[normalizedCode] || null;
}

/**
 * Normalize region code to 4-digit format
 * API returns 10-digit codes (행정표준코드), PDF documents 4-digit codes
 */
function normalizeRegionCode(code: string): string {
  return code.length === 10 ? code.substring(0, 4) : code;
}

/**
 * Check if organization regions match program requirements
 */
export function checkRegionEligibility(
  orgRegions: KoreanRegion[],
  programRegionCodes: string[]
): { eligible: boolean; reason: string } {
  // Normalize all program region codes to 4-digit format
  const normalizedProgramCodes = programRegionCodes.map(normalizeRegionCode);

  // No requirement or 전국 (nationwide) - eligible
  if (normalizedProgramCodes.length === 0 ||
      normalizedProgramCodes.includes('1000') ||
      programRegionCodes.includes('1000000000')) {
    return { eligible: true, reason: '지역 제한 없음' };
  }

  // No org data - cannot verify
  if (orgRegions.length === 0) {
    return { eligible: false, reason: '소재지 정보 필요' };
  }

  const orgRegionCodes = orgRegions.map(mapRegionToCode);
  const hasMatch = normalizedProgramCodes.some(code => orgRegionCodes.includes(code));

  return {
    eligible: hasMatch,
    reason: hasMatch ? '지역 조건 충족' : '지역 조건 미충족',
  };
}

// ============================================================================
// Region Extraction from Title (Fallback for missing targetRegionCodes)
// ============================================================================

/**
 * Region name to KoreanRegion mapping for title extraction
 */
const REGION_NAME_TO_ENUM: Record<string, KoreanRegion> = {
  '서울': 'SEOUL',
  '경기': 'GYEONGGI',
  '인천': 'INCHEON',
  '부산': 'BUSAN',
  '대구': 'DAEGU',
  '광주': 'GWANGJU',
  '대전': 'DAEJEON',
  '울산': 'ULSAN',
  '세종': 'SEJONG',
  '강원': 'GANGWON',
  '충북': 'CHUNGBUK',
  '충남': 'CHUNGNAM',
  '전북': 'JEONBUK',
  '전남': 'JEONNAM',
  '경북': 'GYEONGBUK',
  '경남': 'GYEONGNAM',
  '제주': 'JEJU',
};

/**
 * Strong context keywords that indicate regional program scope
 * when appearing after a region name (e.g., "강원 로컬벤처" → Gangwon-specific)
 */
const REGIONAL_CONTEXT_KEYWORDS = [
  '로컬벤처',
  '로컬크리에이터',
  '창업',
  '스타트업',
  '육성',
  '지원',
  '혁신',
  '소상공인',
  '중소기업',
  '벤처',
  '기업',
  '테크노파크',
  '창조경제',
  '경제혁신',
];

/**
 * Extract region from program title when targetRegionCodes is empty.
 * Handles patterns like:
 *   - "[대구] 2025년 ..." → DAEGU
 *   - "[전남] 소상공인 ..." → JEONNAM
 *   - "[대구ㆍ경북] ..." → [DAEGU, GYEONGBUK]
 *   - "대구 주도형 AI 대전환 ..." → DAEGU
 *   - "2026년 강원 로컬벤처기업 ..." → GANGWON (v2.0)
 *   - "2025년도 부산 창업지원 ..." → BUSAN (v2.0)
 *
 * v2.0 Enhancements (2026-01-29):
 * - Pattern 3: Region after year prefix (e.g., "2026년 강원 ...")
 * - Pattern 4: Region with context keywords anywhere in title
 *
 * @param title Program title
 * @returns Array of KoreanRegion enums extracted from title, empty if nationwide/no region
 */
export function extractRegionFromTitle(title: string): KoreanRegion[] {
  const regions: KoreanRegion[] = [];

  // Pattern 1: Bracketed region at start, e.g., "[대구]", "[전남]", "[대구ㆍ경북]"
  const bracketMatch = title.match(/^\[([^\]]+)\]/);
  if (bracketMatch) {
    const bracketContent = bracketMatch[1];
    // Split by common separators (ㆍ, ·, /, ,)
    const parts = bracketContent.split(/[ㆍ·\/,]/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (REGION_NAME_TO_ENUM[trimmed]) {
        regions.push(REGION_NAME_TO_ENUM[trimmed]);
      }
    }
  }

  // Pattern 2: Region name at start without brackets, e.g., "대구 주도형"
  if (regions.length === 0) {
    for (const [name, region] of Object.entries(REGION_NAME_TO_ENUM)) {
      // Match region name followed by space at start of title
      if (title.startsWith(`${name} `) || title.startsWith(`${name}시 `) || title.startsWith(`${name}도 `)) {
        regions.push(region);
        break;
      }
    }
  }

  // Pattern 3 (v2.0): Region after year prefix, e.g., "2026년 강원 로컬벤처..."
  // Matches: "2026년 강원", "2025년도 부산", "2026년 경기 창업"
  if (regions.length === 0) {
    const yearPrefixMatch = title.match(/^\d{4}년도?\s+([가-힣]{2,3})\s/);
    if (yearPrefixMatch) {
      const possibleRegion = yearPrefixMatch[1];
      if (REGION_NAME_TO_ENUM[possibleRegion]) {
        regions.push(REGION_NAME_TO_ENUM[possibleRegion]);
      }
    }
  }

  // Pattern 4 (v2.0): Region with strong context keywords anywhere in title
  // e.g., "강원 로컬벤처", "부산 창업지원", "대구 스타트업 육성"
  // This pattern requires both region name AND context keyword to avoid false positives
  if (regions.length === 0) {
    for (const [name, region] of Object.entries(REGION_NAME_TO_ENUM)) {
      // Build pattern: region name followed by space and context keyword
      for (const contextKeyword of REGIONAL_CONTEXT_KEYWORDS) {
        // Check if title contains "지역 + 컨텍스트키워드" pattern
        // e.g., "강원 로컬벤처", "강원로컬벤처", "강원 로컬벤처기업"
        const patternWithSpace = `${name} ${contextKeyword}`;
        const patternNoSpace = `${name}${contextKeyword}`;

        if (title.includes(patternWithSpace) || title.includes(patternNoSpace)) {
          regions.push(region);
          break;
        }
      }
      if (regions.length > 0) break;
    }
  }

  return regions;
}

/**
 * Check if a program title indicates a regional program (not nationwide)
 *
 * @param title Program title
 * @returns true if title suggests a regional restriction
 */
export function hasRegionalIndicatorInTitle(title: string): boolean {
  return extractRegionFromTitle(title).length > 0;
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
  extractRegionFromTitle,
  hasRegionalIndicatorInTitle,
};
