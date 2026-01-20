/**
 * SME24 API TypeScript Interfaces
 *
 * Type definitions for 중소벤처24 Open API responses.
 * Field names match the API documentation exactly (Korean field codes).
 */

// ============================================================================
// Announcement API Types (민간공고목록정보)
// ============================================================================

/**
 * Raw API response for announcement list
 */
export interface SME24AnnouncementListResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: SME24AnnouncementItem[];
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

/**
 * Individual announcement item from API
 * Field names match SME24 API documentation
 */
export interface SME24AnnouncementItem {
  // Core identifiers
  pblancSeq: number;              // 공고SEQ (Primary ID)
  pblancNm: string;               // 공고명
  detailBsnsNm?: string;          // 세부사업명

  // Content (may contain HTML)
  policyCnts?: string;            // 사업개요
  sportMg?: string;               // 지원규모
  sportCnts?: string;             // 지원내용
  sportTrget?: string;            // 지원대상
  reqstRcept?: string;            // 신청방법

  // Organization & Contact
  sportInsttNm?: string;          // 지원기관명
  sportInsttCd?: string;          // 지원기관코드
  refrnc?: string;                // 문의처
  refrncUrl?: string;             // 문의처 홈페이지
  refrncDept?: string;            // 문의처 부서
  refrncTel?: string;             // 문의처 전화번호
  cntcInsttNm?: string;           // 연계기관명
  cntcInsttCd?: string;           // 연계기관코드

  // URLs & Attachments
  pblancDtlUrl?: string;          // 상세정보경로
  reqstLinkInfo?: string;         // 온라인 신청 URL
  pblancAttach?: string;          // 첨부파일URL (pipe-separated)
  pblancAttachNm?: string;        // 첨부파일명 (pipe-separated)
  pblancFileUrl?: string;         // 공고문 URL
  pblancFileNm?: string;          // 공고문 파일명

  // Dates (YYYYMMDD or YYYY-MM-DD format)
  pblancBgnDt?: string;           // 신청시작일
  pblancEndDt?: string;           // 신청마감일
  creatDt?: string;               // 공고등록일
  updDt?: string;                 // 수정일시

  // Program Classification
  bizType?: string;               // 사업유형
  bizTypeCd?: string;             // 사업유형코드
  sportType?: string;             // 지원유형
  sportTypeCd?: string;           // 지원유형코드
  lifeCyclDvsn?: string;          // 생애주기구분 (pipe-separated)
  lifeCyclDvsnCd?: string;        // 생애주기구분코드 (pipe-separated)

  // Target Eligibility Criteria
  areaNm?: string;                // 지역명 (pipe-separated)
  areaCd?: string;                // 지역코드 (pipe-separated)
  cmpScale?: string;              // 기업규모 (pipe-separated)
  cmpScaleCd?: string;            // 기업규모코드 (pipe-separated)
  salsAmt?: string;               // 매출액 (pipe-separated)
  salsAmtCd?: string;             // 매출액코드 (pipe-separated)
  minSalsAmt?: number;            // 최소 매출액
  maxSalsAmt?: number;            // 최대 매출액
  emplyCnt?: string;              // 종업원수 (pipe-separated)
  emplyCntCd?: string;            // 종업원수코드 (pipe-separated)
  minEmplyCnt?: number;           // 최소 종업원수
  mixEmplyCnt?: number;           // 최대 종업원수 (API typo: "mix" instead of "max")
  ablbiz?: string;                // 업력 (pipe-separated)
  ablbizCd?: string;              // 업력코드 (pipe-separated)
  minAblbiz?: number;             // 최소 업력 (년)
  maxAblbiz?: number;             // 최대 업력 (년)
  rpsntAge?: number;              // 대표자 연령
  minRpsntAge?: number;           // 최소 대표자 연령
  maxRpsntAge?: number;           // 최대 대표자 연령
  induty?: string;                // 업종

  // Required Certifications
  needCrtfn?: string;             // 필요인증 (pipe-separated)
  needCrtfnCd?: string;           // 필요인증코드 (pipe-separated)

  // Financial Details
  minSportAmt?: number;           // 최소 지원금액
  maxSportAmt?: number;           // 최대 지원금액
  minInrst?: number;              // 최소 금리
  maxInrst?: number;              // 최대 금리

  // Special Flags
  refntnYn?: string;              // 재창업여부 (Y/N)
  fntnYn?: string;                // 예비창업여부 (Y/N)
  fmleRpsntYn?: string;           // 여성대표여부 (Y/N)
}

// ============================================================================
// Certificate API Types (인증서 확인)
// ============================================================================

/**
 * Certificate verification request parameters
 */
export interface CertificateVerifyRequest {
  bizno: string;                  // 사업자등록번호 (10 digits, no dashes)
  certType: 'y104' | 'y105' | 'y106';  // Certificate type code
}

/**
 * InnoBiz certificate response (이노비즈확인서 - y105)
 */
export interface InnoBizCertificateResponse {
  resultCode: string;
  resultMsg: string;
  data?: {
    inno_bsno: string;            // 사업자등록번호
    inno_entrpnm: string;         // 기업명
    inno_valday: string;          // 유효기간 시작일
    inno_valday_end: string;      // 유효기간 종료일
    inno_grade?: string;          // 등급 (A, B, etc.)
    inno_score?: string;          // 점수
  };
}

/**
 * Venture certificate response (벤처기업확인서 - y106)
 */
export interface VentureCertificateResponse {
  resultCode: string;
  resultMsg: string;
  data?: {
    vntr_bsno: string;            // 사업자등록번호
    vntr_entrpnm: string;         // 기업명
    vntr_bgng_vld_ymd: string;    // 유효기간 시작일
    vntr_end_vld_ymd: string;     // 유효기간 종료일
    vntr_type?: string;           // 벤처유형 (투자유형, 기술보증유형, etc.)
    vntr_tech_field?: string;     // 기술분야
  };
}

/**
 * MainBiz certificate response (메인비즈확인서 - y104)
 */
export interface MainBizCertificateResponse {
  resultCode: string;
  resultMsg: string;
  data?: {
    mainbiz_bsno: string;         // 사업자등록번호
    mainbiz_entrpnm: string;      // 기업명
    VLD_SDT: string;              // 유효기간 시작일
    VLD_EDT: string;              // 유효기간 종료일
  };
}

/**
 * Unified certificate verification result
 */
export interface CertificateVerifyResult {
  certType: 'INNOBIZ' | 'VENTURE' | 'MAINBIZ';
  verified: boolean;
  companyName?: string;
  validFrom?: string;             // YYYY-MM-DD
  validUntil?: string;            // YYYY-MM-DD
  isExpired?: boolean;
  daysUntilExpiry?: number;
  additionalInfo?: {
    grade?: string;               // InnoBiz grade
    score?: string;               // InnoBiz score
    ventureType?: string;         // Venture type
    techField?: string;           // Venture tech field
  };
  rawResponse?: unknown;          // Original API response for debugging
  error?: string;
}

/**
 * Combined certification verification result for organization
 */
export interface OrganizationCertificationResult {
  innoBiz: CertificateVerifyResult | null;
  venture: CertificateVerifyResult | null;
  mainBiz: CertificateVerifyResult | null;
  verifiedAt: string;             // ISO timestamp
  hasAnyCertification: boolean;
  certificationSummary: string[];  // List of valid certifications
}

// ============================================================================
// API Client Types
// ============================================================================

/**
 * Search parameters for announcement API
 */
export interface SME24SearchParams {
  pageNo?: number;                // 페이지 번호 (default: 1)
  numOfRows?: number;             // 한 페이지 결과 수 (default: 100, max: 1000)
  strDt?: string;                 // 검색시작일 (YYYYMMDD)
  endDt?: string;                 // 검색종료일 (YYYYMMDD)
  bizTypeCd?: string;             // 사업유형코드
  sportTypeCd?: string;           // 지원유형코드
  areaCd?: string;                // 지역코드
}

/**
 * Generic API response wrapper
 */
export interface SME24ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  totalCount?: number;
  pageNo?: number;
}

// ============================================================================
// Code Mapping Types
// ============================================================================

/**
 * Company scale codes from SME24 API
 */
export const COMPANY_SCALE_CODES = {
  CC10: '중소기업',
  CC30: '소상공인',
  CC50: '중견기업',
  CC60: '창업기업',
  CC80: '기타',
} as const;

/**
 * Revenue range codes from SME24 API
 */
export const SALES_AMOUNT_CODES = {
  SI01: '5억미만',
  SI02: '5억~10억',
  SI03: '10억~20억',
  SI04: '20억~50억',
  SI05: '50억~100억',
  SI06: '100억~300억',
  SI07: '300억이상',
} as const;

/**
 * Employee count codes from SME24 API
 */
export const EMPLOYEE_COUNT_CODES = {
  EI01: '1~5명미만',
  EI02: '5~10명미만',
  EI03: '10~20명미만',
  EI04: '20~50명미만',
  EI05: '50~100명미만',
  EI06: '100명이상',
} as const;

/**
 * Business age codes from SME24 API
 */
export const BUSINESS_AGE_CODES = {
  OI01: '3년미만',
  OI02: '3~5년',
  OI03: '5~7년',
  OI04: '7~10년',
  OI05: '10~15년',
  OI06: '15년이상',
} as const;

/**
 * Certification codes from SME24 API
 */
export const CERTIFICATION_CODES = {
  EC06: '이노비즈',
  EC07: '메인비즈',
  EC08: '벤처기업',
  EC01: '여성기업',
  EC02: '장애인기업',
  EC03: '사회적기업',
  EC04: '녹색인증기업',
  EC05: '기업부설연구소',
  EC09: '가족친화기업',
  EC10: '고용우수기업',
} as const;

/**
 * Region codes from SME24 API
 */
export const REGION_CODES = {
  '1000': '전국',
  '1100': '서울',
  '2100': '부산',
  '2200': '대구',
  '2300': '인천',
  '2400': '광주',
  '2500': '대전',
  '2600': '울산',
  '2900': '세종',
  '3100': '경기',
  '3200': '강원',
  '3300': '충북',
  '3400': '충남',
  '3500': '전북',
  '3600': '전남',
  '3700': '경북',
  '3800': '경남',
  '3900': '제주',
} as const;
