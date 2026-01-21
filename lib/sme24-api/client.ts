/**
 * SME24 API Client
 *
 * HTTP client for 중소벤처24 Open API with rate limiting.
 * Handles both announcement fetching and certificate verification.
 *
 * API Documentation:
 * - Announcement: https://www.smes.go.kr/fnct/apiReqst/extPblancInfo
 * - Certificate: https://www.smes.go.kr/venturein/pbntc/searchPbntc.do
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { sme24Config, rateLimitConfig, CERTIFICATE_ENDPOINTS } from './config';
import {
  SME24SearchParams,
  SME24ApiResponse,
  SME24AnnouncementItem,
  SME24AnnouncementListResponse,
  CertificateVerifyResult,
  InnoBizCertificateResponse,
  VentureCertificateResponse,
  MainBizCertificateResponse,
} from './types';

/**
 * Simple rate limiter using token bucket algorithm
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.refillRate = requestsPerMinute / 60;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

/**
 * SME24 API Client
 */
export class SME24Client {
  private httpClient: AxiosInstance;
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(rateLimitConfig.requestsPerMinute);

    this.httpClient = axios.create({
      timeout: sme24Config.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Connect-Platform/1.0',
      },
    });

    // Add request logging interceptor
    this.httpClient.interceptors.request.use((config) => {
      console.log(`[SME24] Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response logging interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`[SME24] Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error: AxiosError) => {
        console.error(`[SME24] Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // Announcement API Methods
  // ============================================================================

  /**
   * Fetch SME support program announcements
   *
   * Official SME24 API Response Format (per PDF guide page 4):
   * {
   *   "resultCd": "0",           // "0" = success (NOT "00")
   *   "data": [...],             // Array of announcements (NOT nested in response.body.items.item)
   *   "resultMsg": "정상적으로 조회되었습니다."
   * }
   *
   * Supported query params (per PDF guide page 2):
   * - token (required)
   * - strDt / endDt (optional date range, YYYYMMDD)
   * - html (optional, strip HTML tags)
   * Note: pageNo/numOfRows are NOT supported - API returns all matching records
   *
   * @param params Search parameters
   * @returns List of announcement items
   */
  async fetchAnnouncements(
    params: SME24SearchParams = {}
  ): Promise<SME24ApiResponse<SME24AnnouncementItem[]>> {
    await this.rateLimiter.acquire();

    try {
      // Build query params - only include supported parameters
      const queryParams = new URLSearchParams({
        token: sme24Config.announcementApiKey,
        ...(params.strDt && { strDt: params.strDt }),
        ...(params.endDt && { endDt: params.endDt }),
      });

      const url = `${sme24Config.announcementBaseUrl}?${queryParams.toString()}`;
      console.log(`[SME24] Fetching: ${sme24Config.announcementBaseUrl}?token=***&strDt=${params.strDt || 'N/A'}&endDt=${params.endDt || 'N/A'}`);

      const response = await this.httpClient.get<SME24AnnouncementListResponse>(url);

      // Handle actual SME24 API response format (flat structure)
      const apiResponse = response.data;

      // Debug: Log response structure for troubleshooting
      console.log(`[SME24] Response resultCd: ${apiResponse?.resultCd}, resultMsg: ${apiResponse?.resultMsg}`);
      console.log(`[SME24] Response data count: ${Array.isArray(apiResponse?.data) ? apiResponse.data.length : 'N/A'}`);

      // Check for API error (resultCd !== "0")
      if (apiResponse?.resultCd !== '0') {
        return {
          success: false,
          error: apiResponse?.resultMsg || 'Unknown API error',
          statusCode: parseInt(apiResponse?.resultCd || '99'),
        };
      }

      // Extract items from flat data array
      const items: SME24AnnouncementItem[] = Array.isArray(apiResponse?.data)
        ? apiResponse.data
        : [];

      return {
        success: true,
        data: items,
        totalCount: items.length, // API returns all items, no pagination
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch all announcements
   *
   * Note: The SME24 API does NOT support pagination - it returns all matching
   * records in a single response. This method is kept for API compatibility
   * but simply delegates to fetchAnnouncements().
   *
   * @param params Base search parameters
   * @param _maxPages Deprecated - API returns all records, no pagination
   * @returns All announcement items
   */
  async fetchAllAnnouncements(
    params: SME24SearchParams = {},
    _maxPages: number = 10 // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<SME24ApiResponse<SME24AnnouncementItem[]>> {
    // SME24 API returns all records in one call - no pagination needed
    console.log('[SME24] fetchAllAnnouncements: API returns all records, no pagination');
    return this.fetchAnnouncements(params);
  }

  // ============================================================================
  // Certificate Verification API Methods
  // ============================================================================

  /**
   * Verify InnoBiz certification (이노비즈확인서 - y105)
   * Official API v3: GET /api/certificates/{certCode}?bizno={bizno}
   * Auth: Authorization: Bearer {token}
   *
   * @param bizno Business registration number (10 digits, no dashes)
   * @returns Certificate verification result
   */
  async verifyInnoBiz(bizno: string): Promise<CertificateVerifyResult> {
    await this.rateLimiter.acquire();

    try {
      const cleanBizno = bizno.replace(/-/g, '');
      const certCode = CERTIFICATE_ENDPOINTS.INNOBIZ.code;
      const url = `${sme24Config.certificateBaseUrl}/${certCode}`;

      const response = await this.httpClient.get<InnoBizCertificateResponse>(url, {
        params: { bizno: cleanBizno },
        headers: {
          'Authorization': `Bearer ${sme24Config.innoBizApiKey}`,
        },
      });

      const data = response.data;

      if (data.resultCode !== '00' || !data.data) {
        return {
          certType: 'INNOBIZ',
          verified: false,
          error: data.resultMsg || 'Certificate not found',
          rawResponse: data,
        };
      }

      const certData = data.data;
      const validUntil = this.parseDate(certData.inno_valday_end);
      const isExpired = validUntil ? new Date(validUntil) < new Date() : false;

      return {
        certType: 'INNOBIZ',
        verified: true,
        companyName: certData.inno_entrpnm,
        validFrom: this.parseDate(certData.inno_valday),
        validUntil,
        isExpired,
        daysUntilExpiry: this.calculateDaysUntil(validUntil),
        additionalInfo: {
          grade: certData.inno_grade,
          score: certData.inno_score,
        },
        rawResponse: data,
      };
    } catch (error) {
      return {
        certType: 'INNOBIZ',
        verified: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Verify Venture Business certification (벤처기업확인서 - y106)
   * Official API v3: GET /api/certificates/{certCode}?bizno={bizno}
   * Auth: Authorization: Bearer {token}
   *
   * @param bizno Business registration number (10 digits, no dashes)
   * @returns Certificate verification result
   */
  async verifyVenture(bizno: string): Promise<CertificateVerifyResult> {
    await this.rateLimiter.acquire();

    try {
      const cleanBizno = bizno.replace(/-/g, '');
      const certCode = CERTIFICATE_ENDPOINTS.VENTURE.code;
      const url = `${sme24Config.certificateBaseUrl}/${certCode}`;

      const response = await this.httpClient.get<VentureCertificateResponse>(url, {
        params: { bizno: cleanBizno },
        headers: {
          'Authorization': `Bearer ${sme24Config.ventureApiKey}`,
        },
      });

      const data = response.data;

      if (data.resultCode !== '00' || !data.data) {
        return {
          certType: 'VENTURE',
          verified: false,
          error: data.resultMsg || 'Certificate not found',
          rawResponse: data,
        };
      }

      const certData = data.data;
      const validUntil = this.parseDate(certData.vntr_end_vld_ymd);
      const isExpired = validUntil ? new Date(validUntil) < new Date() : false;

      return {
        certType: 'VENTURE',
        verified: true,
        companyName: certData.vntr_entrpnm,
        validFrom: this.parseDate(certData.vntr_bgng_vld_ymd),
        validUntil,
        isExpired,
        daysUntilExpiry: this.calculateDaysUntil(validUntil),
        additionalInfo: {
          ventureType: certData.vntr_type,
          techField: certData.vntr_tech_field,
        },
        rawResponse: data,
      };
    } catch (error) {
      return {
        certType: 'VENTURE',
        verified: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Verify MainBiz certification (메인비즈확인서 - y104)
   * Official API v3: GET /api/certificates/{certCode}?bizno={bizno}
   * Auth: Authorization: Bearer {token}
   *
   * @param bizno Business registration number (10 digits, no dashes)
   * @returns Certificate verification result
   */
  async verifyMainBiz(bizno: string): Promise<CertificateVerifyResult> {
    await this.rateLimiter.acquire();

    try {
      const cleanBizno = bizno.replace(/-/g, '');
      const certCode = CERTIFICATE_ENDPOINTS.MAINBIZ.code;
      const url = `${sme24Config.certificateBaseUrl}/${certCode}`;

      const response = await this.httpClient.get<MainBizCertificateResponse>(url, {
        params: { bizno: cleanBizno },
        headers: {
          'Authorization': `Bearer ${sme24Config.mainBizApiKey}`,
        },
      });

      const data = response.data;

      if (data.resultCode !== '00' || !data.data) {
        return {
          certType: 'MAINBIZ',
          verified: false,
          error: data.resultMsg || 'Certificate not found',
          rawResponse: data,
        };
      }

      const certData = data.data;
      const validUntil = this.parseDate(certData.VLD_EDT);
      const isExpired = validUntil ? new Date(validUntil) < new Date() : false;

      return {
        certType: 'MAINBIZ',
        verified: true,
        companyName: certData.mainbiz_entrpnm,
        validFrom: this.parseDate(certData.VLD_SDT),
        validUntil,
        isExpired,
        daysUntilExpiry: this.calculateDaysUntil(validUntil),
        rawResponse: data,
      };
    } catch (error) {
      return {
        certType: 'MAINBIZ',
        verified: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parse date string from various formats to YYYY-MM-DD
   */
  private parseDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;

    // Handle YYYYMMDD format
    if (/^\d{8}$/.test(dateStr)) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }

    // Handle YYYY-MM-DD format (already correct)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try to parse other formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return undefined;
  }

  /**
   * Calculate days until a date
   */
  private calculateDaysUntil(dateStr: string | undefined): number | undefined {
    if (!dateStr) return undefined;

    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Handle API errors
   */
  private handleError<T>(error: unknown): SME24ApiResponse<T> {
    return {
      success: false,
      error: this.getErrorMessage(error),
    };
  }

  /**
   * Extract error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return axiosError.response?.data?.message
        || axiosError.message
        || 'Network error';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error occurred';
  }
}

// Export singleton instance
export const sme24Client = new SME24Client();
