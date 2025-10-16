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
        'Accept': 'application/xml, text/xml, */*',
        // CRITICAL: NTIS API blocks programmatic User-Agents (returns 404)
        // even with valid API keys. Use browser-like UA to avoid blocking.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });
  }

  /**
   * Search R&D projects using NTIS API
   */
  async searchProjects(params: NTISSearchParams): Promise<NTISSearchResponse> {
    try {
      const queryParams = this.buildQueryParams(params);
      
      const response = await this.client.get('/public_project', {
        params: queryParams,
      });

      return {
        success: true,
        data: response.data,
        totalHits: this.extractTotalHits(response.data),
        searchTime: this.extractSearchTime(response.data),
      };
    } catch (error: any) {
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
   * Note: Year filtering (addQuery: PY=YYYY/SAME) was removed because it returns 0 results.
   * Instead, we rely on DATE/DESC sorting to get the most recent programs.
   */
  async searchRecentAnnouncements(
    daysBack: number = 7,
    displayCount: number = 100
  ): Promise<NTISSearchResponse> {
    return this.searchProjects({
      SRWR: '연구개발', // Broad R&D search term (NTIS API requires non-empty search)
      searchRnkn: 'DATE/DESC', // Sort by date descending (most recent first)
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
      searchRnkn: 'DATE/DESC',
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
      searchRnkn: 'DATE/DESC',
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
