/**
 * NTIS API Client
 * 
 * Official API client for accessing National Science & Technology Information Service
 * More stable and efficient than HTML scraping
 */

import axios, { AxiosInstance } from 'axios';
import { NTISConfig, NTISSearchParams, NTISSearchResponse } from './types';

export class NTISApiClient {
  private client: AxiosInstance;
  private config: NTISConfig;

  constructor(config: NTISConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 30000,
      headers: {
        // Note: NTIS API rejects 'Accept: application/xml' header (returns 404)
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use((config) => {
      const url = `${config.baseURL}${config.url}`;
      const params = new URLSearchParams(config.params as any).toString();
      console.log('🌐 Full URL:', `${url}?${params}`);
      console.log('📋 Headers:', JSON.stringify(config.headers, null, 2));
      return config;
    });
  }

  /**
   * Search R&D projects using NTIS API
   */
  async searchProjects(params: NTISSearchParams): Promise<NTISSearchResponse> {
    try {
      const queryParams = this.buildQueryParams(params);

      // Debug logging
      console.log('🔍 NTIS API Request:');
      console.log('   Base URL:', this.config.baseUrl);
      console.log('   Endpoint: /public_project');
      console.log('   Params:', JSON.stringify(queryParams, null, 2));

      const response = await this.client.get('/public_project', {
        params: queryParams,
      });

      console.log('✅ NTIS API Response:', response.status, response.statusText);
      console.log('   Total Hits:', this.extractTotalHits(response.data));

      return {
        success: true,
        data: response.data,
        totalHits: this.extractTotalHits(response.data),
        searchTime: this.extractSearchTime(response.data),
      };
    } catch (error: any) {
      console.error('❌ NTIS API Error:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Status Text:', error.response.statusText);
        console.error('   URL:', error.config?.url);
      }
      return {
        success: false,
        error: error.message,
        totalHits: 0,
        searchTime: 0,
      };
    }
  }

  /**
   * Search recent announcements (공고) from specific date range
   *
   * Note: The NTIS API does not support sorting (searchRnkn parameter causes 404).
   * Results are returned in the API's default order.
   */
  async searchRecentAnnouncements(
    daysBack: number = 7,
    displayCount: number = 100
  ): Promise<NTISSearchResponse> {
    return this.searchProjects({
      SRWR: '연구개발', // Broad R&D search term (NTIS API requires non-empty search)
      startPosition: 1,
      displayCnt: displayCount,
    });
  }

  /**
   * Search by keywords
   */
  async searchByKeywords(
    keywords: string[],
    options: Partial<NTISSearchParams> = {}
  ): Promise<NTISSearchResponse> {
    // Combine keywords with OR operator
    const query = keywords.join('|');

    return this.searchProjects({
      SRWR: query,
      startPosition: 1,
      displayCnt: 100,
      ...options,
    });
  }

  /**
   * Search by agency (전문기관)
   */
  async searchByAgency(
    agencyName: string,
    options: Partial<NTISSearchParams> = {}
  ): Promise<NTISSearchResponse> {
    return this.searchProjects({
      SRWR: agencyName,
      searchFd: 'OG', // Search in agency field
      startPosition: 1,
      displayCnt: 100,
      ...options,
    });
  }

  /**
   * Build query parameters for API request
   */
  private buildQueryParams(params: NTISSearchParams): Record<string, string> {
    const query: Record<string, string> = {
      apprvKey: this.config.apiKey,
      collection: 'project',
      SRWR: params.SRWR || '',
      startPosition: String(params.startPosition || 1),
      displayCnt: String(params.displayCnt || 100),
    };

    // Add optional parameters
    if (params.userId) query.userId = params.userId;
    if (params.searchFd) query.searchFd = params.searchFd;
    if (params.addQuery) query.addQuery = params.addQuery;
    if (params.searchRnkn) query.searchRnkn = params.searchRnkn;

    return query;
  }

  /**
   * Extract total hits from XML response
   */
  private extractTotalHits(xmlData: string): number {
    const match = xmlData.match(/<TOTALHITS>(\d+)<\/TOTALHITS>/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract search time from XML response
   */
  private extractSearchTime(xmlData: string): number {
    const match = xmlData.match(/<SEARCHTIME>([\d.]+)<\/SEARCHTIME>/);
    return match ? parseFloat(match[1]) : 0;
  }
}
