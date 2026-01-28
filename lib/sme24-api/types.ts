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
 *
 * Actual SME24 API response format (per official PDF guide, page 4):
 * {
 *   "resultCd": "0",
 *   "data": [{ announcement items }],
 *   "resultMsg": "정상적으로 조회되었습니다."
 * }
 *
 * Note: This is a FLAT structure, NOT wrapped in response.header/body like data.go.kr
 */
export interface SME24AnnouncementListResponse {
  resultCd: string;              // "0" = success, other values = error
  resultMsg: string;             // Human-readable message
  data: SME24AnnouncementItem[]; // Array of announcements (flat, not nested)
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
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 1
 *
 * Note: Only token, strDt, endDt, and html are officially supported.
 * - pageNo/numOfRows are NOT supported - API returns all matching records
 * - bizTypeCd/sportTypeCd/areaCd are NOT documented as supported params
 */
export interface SME24SearchParams {
  strDt?: string;                 // 검색시작일 (YYYYMMDD) - optional
  endDt?: string;                 // 검색종료일 (YYYYMMDD) - optional
  html?: 'yes' | 'no';            // HTML 여부 - 'yes'=HTML태그포함(기본값), 'no'=텍스트만
  // Legacy fields kept for backward compatibility but not sent to API
  pageNo?: number;                // DEPRECATED: Not supported by API
  numOfRows?: number;             // DEPRECATED: Not supported by API
  bizTypeCd?: string;             // DEPRECATED: Not documented as supported
  sportTypeCd?: string;           // DEPRECATED: Not documented as supported
  areaCd?: string;                // DEPRECATED: Not documented as supported
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
 * Company scale codes from SME24 API (기업분류기준코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 5
 */
export const COMPANY_SCALE_CODES = {
  CC10: '중소기업',
  CC30: '소상공인',
  CC50: '1인기업',      // Fixed: was incorrectly '중견기업'
  CC60: '창업기업',
  CC70: '예비창업자',   // Added: was missing
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
 * Business age codes from SME24 API (업력구간코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 6
 */
export const BUSINESS_AGE_CODES = {
  OI01: '3년미만',
  OI02: '3년이상~5년미만',
  OI03: '5년이상~7년미만',
  OI04: '7년이상~10년미만',
  OI05: '10년이상~20년미만',  // Fixed: was '10~15년'
  OI06: '20년이상',           // Fixed: was '15년이상'
} as const;

/**
 * Certification codes from SME24 API (기업인증/확인유형코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 5-6
 */
export const CERTIFICATION_CODES = {
  EC01: '수출유망중소기업',
  EC02: '여성기업',
  EC03: '장애인기업',
  EC04: '중소기업',
  EC05: '소상공인',
  EC06: '기술혁신형중소기업',  // 이노비즈
  EC07: '경영혁신형중소기업',  // 메인비즈
  EC08: '벤처기업',
  EC09: '우수그린비즈',
  EC10: '사회적기업',
  EC11: '연구소보유',
  EC12: '지식재산경영인증 기업',
  EC13: '부품소재기업',
  EC14: '뿌리기술기업',
  EC15: '에너지기술기업',
  EC16: '기술전문기업',
  EC17: '직접생산확인기업',
} as const;

/**
 * Region codes from SME24 API (지역코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 7-8
 *
 * NOTE: API returns 10-digit codes (행정표준코드), PDF shows 4-digit codes.
 * We support both formats for compatibility.
 */
export const REGION_CODES = {
  // 4-digit codes (per PDF documentation)
  '1000': '전국',
  '1100': '서울특별시',
  '2600': '부산광역시',
  '2700': '대구광역시',
  '2800': '인천광역시',
  '2900': '광주광역시',
  '3000': '대전광역시',
  '3100': '울산광역시',
  '3611': '세종특별자치시',
  '4100': '경기도',
  '4200': '강원도',
  '4300': '충청북도',
  '4400': '충청남도',
  '4500': '전라북도',
  '4600': '전라남도',
  '4700': '경상북도',
  '4800': '경상남도',
  '5000': '제주특별자치도',
  // 10-digit codes (actual API response format - 행정표준코드)
  '1000000000': '전국',
  '1100000000': '서울특별시',
  '2600000000': '부산광역시',
  '2700000000': '대구광역시',
  '2800000000': '인천광역시',
  '2900000000': '광주광역시',
  '3000000000': '대전광역시',
  '3100000000': '울산광역시',
  '3611000000': '세종특별자치시',
  '4100000000': '경기도',
  '4200000000': '강원도',
  '4300000000': '충청북도',
  '4400000000': '충청남도',
  '4500000000': '전라북도',
  '4600000000': '전라남도',
  '4700000000': '경상북도',
  '4800000000': '경상남도',
  '5000000000': '제주특별자치도',
} as const;

/**
 * Life cycle division codes from SME24 API (생애주기구분코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 6
 */
export const LIFE_CYCLE_CODES = {
  LC01: '창업',
  LC02: '성장',
  LC03: '폐업·재기',
} as const;

/**
 * Business type codes from SME24 API (사업유형코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 6
 */
export const BUSINESS_TYPE_CODES = {
  PC10: '금융',
  PC11: '벤처',
  PC12: '기타지원',    // Added: found in live API data
  PC20: '기술',
  PC30: '인력',
  PC40: '수출',
  PC50: '내수',
  PC60: '창업',
  PC70: '경영',
  PC80: '소상공인',
  PC90: '지원',
  PC99: '기타',        // Added: found in live API data
} as const;

/**
 * Support type codes from SME24 API (지원유형코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 6-7
 */
export const SUPPORT_TYPE_CODES = {
  RT01: '창업',
  RT02: '기술개발',
  RT03: '정책자금',
  RT04: '기술보증',
  RT05: '스마트공장',
  RT06: '소상공인',
  RT07: '인력지원',
  RT08: '수출지원',
  RT09: '기업지원',
  RT10: '정보',
} as const;

/**
 * Support institution codes from SME24 API (지원기관코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 7
 */
export const SUPPORT_INSTITUTION_CODES = {
  SP01: '중소벤처기업진흥공단',
  SP02: '중소기업기술정보진흥원',
  SP03: '중소기업유통센터',
  SP04: '창업진흥원',
  SP05: '소상공인시장진흥공단',
  SP06: '기술보증기금',
  SP10: '대·중소기업·농어업협력재단',
  SP12: '여성기업종합지원센터',
  SP13: '(재)장애인기업종합지원센터',
  SP14: '한국산업기술진흥원',
  SP15: '지역신용보증재단',
  SP16: '중소벤처기업부',
  SP17: '중소기업중앙회',
  SP18: '중소기업융합중앙회',
  SP19: '한국창업보육협회',
  SP20: '이노비즈협회',
  SP21: '한국경영혁신중소기업협회',
  SP22: '대한무역투자진흥공사',
  SP99: '기타',
} as const;

/**
 * Contact institution codes from SME24 API (연계기관코드)
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 8
 */
export const CONTACT_INSTITUTION_CODES = {
  BI01: 'SMTECH',
  BI02: 'K-STARTUP',
  BI03: '스마트공장',
  BI04: '소상공인 마당',
  BI05: '중소기업 벤처진흥공단(정책자금)',
  BI06: '기술보증기금',
  BI07: '판판대로',
  BI08: '기술보호울타리',
  BI09: '중소기업인력지원사업종합관리시스템',
  BI10: '중소기업해외전시포탈',
  BI11: '협업정보시스템',
  BI12: '중소기업수출지원센터',
  BI13: 'IRIS',
  BI14: '소셜벤처스퀘어',
  BI15: '무역24',
  BI90: '중소기업 벤처진흥공단(기타)',
} as const;
