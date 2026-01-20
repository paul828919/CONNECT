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
  certificateBaseUrl: 'https://www.smes.go.kr/venturein/pbntc/searchPbntc.do',

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
 */
export const API_RESPONSE_CODES = {
  SUCCESS: '00',
  NO_DATA: '01',
  INVALID_KEY: '10',
  INVALID_PARAMS: '20',
  SERVER_ERROR: '99',
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
