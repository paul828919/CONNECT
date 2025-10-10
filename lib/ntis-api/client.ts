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
        'Accept': 'application/xml',
        'User-Agent': 'Connect-Platform/1.0',
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
   */
  async searchRecentAnnouncements(
    daysBack: number = 7,
    displayCount: number = 100
  ): Promise<NTISSearchResponse> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Format dates as YYYY
    const currentYear = endDate.getFullYear();

    return this.searchProjects({
      SRWR: '', // Search all
      searchRnkn: 'DATE/DESC', // Sort by date descending
      addQuery: `PY=${currentYear}/SAME`, // Current year only
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
