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
   * @param params Search parameters
   * @returns List of announcement items
   */
  async fetchAnnouncements(
    params: SME24SearchParams = {}
  ): Promise<SME24ApiResponse<SME24AnnouncementItem[]>> {
    await this.rateLimiter.acquire();

    try {
      const queryParams = new URLSearchParams({
        apiKey: sme24Config.announcementApiKey,
        pageNo: String(params.pageNo || 1),
        numOfRows: String(params.numOfRows || 100),
        ...(params.strDt && { strDt: params.strDt }),
        ...(params.endDt && { endDt: params.endDt }),
        ...(params.bizTypeCd && { bizTypeCd: params.bizTypeCd }),
        ...(params.sportTypeCd && { sportTypeCd: params.sportTypeCd }),
        ...(params.areaCd && { areaCd: params.areaCd }),
      });

      const url = `${sme24Config.announcementBaseUrl}?${queryParams.toString()}`;
      const response = await this.httpClient.get<SME24AnnouncementListResponse>(url);

      // Handle API response structure
      const body = response.data?.response?.body;
      const header = response.data?.response?.header;

      if (header?.resultCode !== '00') {
        return {
          success: false,
          error: header?.resultMsg || 'Unknown API error',
          statusCode: parseInt(header?.resultCode || '99'),
        };
      }

      // Handle single item vs array in XML→JSON conversion
      let items: SME24AnnouncementItem[] = [];
      if (body?.items?.item) {
        items = Array.isArray(body.items.item)
          ? body.items.item
          : [body.items.item];
      }

      return {
        success: true,
        data: items,
        totalCount: body?.totalCount || 0,
        pageNo: body?.pageNo || 1,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch all announcements with pagination
   *
   * @param params Base search parameters
   * @param maxPages Maximum pages to fetch (default: 10)
   * @returns All announcement items across pages
   */
  async fetchAllAnnouncements(
    params: SME24SearchParams = {},
    maxPages: number = 10
  ): Promise<SME24ApiResponse<SME24AnnouncementItem[]>> {
    const allItems: SME24AnnouncementItem[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore && currentPage <= maxPages) {
      const result = await this.fetchAnnouncements({
        ...params,
        pageNo: currentPage,
        numOfRows: 100,
      });

      if (!result.success || !result.data) {
        // If first page fails, return error
        if (currentPage === 1) {
          return result;
        }
        // Otherwise, return what we have
        break;
      }

      allItems.push(...result.data);

      // Check if there are more pages
      const totalCount = result.totalCount || 0;
      const fetchedCount = currentPage * 100;
      hasMore = fetchedCount < totalCount;
      currentPage++;

      // Small delay between paginated requests
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      success: true,
      data: allItems,
      totalCount: allItems.length,
    };
  }

  // ============================================================================
  // Certificate Verification API Methods
  // ============================================================================

  /**
   * Verify InnoBiz certification (이노비즈확인서 - y105)
   *
   * @param bizno Business registration number (10 digits, no dashes)
   * @returns Certificate verification result
   */
  async verifyInnoBiz(bizno: string): Promise<CertificateVerifyResult> {
    await this.rateLimiter.acquire();

    try {
      const cleanBizno = bizno.replace(/-/g, '');
      const url = `${sme24Config.certificateBaseUrl}`;

      const response = await this.httpClient.post<InnoBizCertificateResponse>(url, {
        apiKey: sme24Config.innoBizApiKey,
        serviceCode: CERTIFICATE_ENDPOINTS.INNOBIZ.code,
        bizno: cleanBizno,
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
   *
   * @param bizno Business registration number (10 digits, no dashes)
   * @returns Certificate verification result
   */
  async verifyVenture(bizno: string): Promise<CertificateVerifyResult> {
    await this.rateLimiter.acquire();

    try {
      const cleanBizno = bizno.replace(/-/g, '');
      const url = `${sme24Config.certificateBaseUrl}`;

      const response = await this.httpClient.post<VentureCertificateResponse>(url, {
        apiKey: sme24Config.ventureApiKey,
        serviceCode: CERTIFICATE_ENDPOINTS.VENTURE.code,
        bizno: cleanBizno,
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
   *
   * @param bizno Business registration number (10 digits, no dashes)
   * @returns Certificate verification result
   */
  async verifyMainBiz(bizno: string): Promise<CertificateVerifyResult> {
    await this.rateLimiter.acquire();

    try {
      const cleanBizno = bizno.replace(/-/g, '');
      const url = `${sme24Config.certificateBaseUrl}`;

      const response = await this.httpClient.post<MainBizCertificateResponse>(url, {
        apiKey: sme24Config.mainBizApiKey,
        serviceCode: CERTIFICATE_ENDPOINTS.MAINBIZ.code,
        bizno: cleanBizno,
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
