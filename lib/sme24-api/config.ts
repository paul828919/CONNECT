/**
 * SME24 API Configuration
 *
 * Configuration for 중소벤처24 Open API integration.
 * 4 separate API keys for different services:
 * - Announcement API: 민간공고목록정보
 * - InnoBiz API: 이노비즈확인서 (y105)
 * - Venture API: 벤처기업확인서 (y106)
 * - MainBiz API: 메인비즈확인서 (y104)
 */

export interface SME24Config {
  // Announcement API
  announcementApiKey: string;
  announcementBaseUrl: string;

  // Certificate APIs
  innoBizApiKey: string;
  ventureApiKey: string;
  mainBizApiKey: string;
  certificateBaseUrl: string;

  // Common settings
  timeout: number;
  requestsPerMinute: number;
}

/**
 * SME24 API Configuration from environment variables
 */
export const sme24Config: SME24Config = {
  // Announcement API (민간공고목록정보)
  announcementApiKey: process.env.SME24_ANNOUNCEMENT_API_KEY || '',
  announcementBaseUrl: 'https://www.smes.go.kr/fnct/apiReqst/extPblancInfo',

  // Certificate APIs
  innoBizApiKey: process.env.SME24_INNOBIZ_API_KEY || '',
  ventureApiKey: process.env.SME24_VENTURE_API_KEY || '',
  mainBizApiKey: process.env.SME24_MAINBIZ_API_KEY || '',
  certificateBaseUrl: 'https://www.smes.go.kr/api/certificates',  // Official API v3 endpoint

  // Common settings
  timeout: 30000, // 30 seconds
  requestsPerMinute: 10, // Conservative rate limit
};

/**
 * Certificate API endpoints
 * y104: 메인비즈, y105: 이노비즈, y106: 벤처기업
 */
export const CERTIFICATE_ENDPOINTS = {
  INNOBIZ: {
    code: 'y105',
    name: '이노비즈확인서',
    nameEn: 'Inno-Biz Certificate',
  },
  VENTURE: {
    code: 'y106',
    name: '벤처기업확인서',
    nameEn: 'Venture Business Certificate',
  },
  MAINBIZ: {
    code: 'y104',
    name: '메인비즈확인서',
    nameEn: 'Main-Biz Certificate',
  },
} as const;

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000, // 6 seconds
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
};

/**
 * SME24 API Response codes
 * Reference: 공고정보 연계 API 가이드_V2.pdf Page 5
 */
export const API_RESPONSE_CODES = {
  SUCCESS: '0',           // Fixed: was '00', correct is '0'
  INVALID_KEY_NOT_ALLOWED: '9',   // 인증키 오류. 허용되지 않은 인증키입니다.
  INVALID_KEY_WRONG_API: '10',    // 인증키 오류. 해당 API의 인증키가 아닙니다.
  INVALID_START_DATE: '11',       // 시작일자 길이 오류
  INVALID_END_DATE: '12',         // 종료일자 길이 오류
  INVALID_DATE_RANGE: '13',       // 검색 기간 오류
  IP_NOT_ALLOWED: '14',           // 허용되지 않은 IP 접근입니다.
  SERVER_ERROR: '99',             // 기타 오류 발생
} as const;

/**
 * Validate that required API keys are configured
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!sme24Config.announcementApiKey) {
    missing.push('SME24_ANNOUNCEMENT_API_KEY');
  }
  if (!sme24Config.innoBizApiKey) {
    missing.push('SME24_INNOBIZ_API_KEY');
  }
  if (!sme24Config.ventureApiKey) {
    missing.push('SME24_VENTURE_API_KEY');
  }
  if (!sme24Config.mainBizApiKey) {
    missing.push('SME24_MAINBIZ_API_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
