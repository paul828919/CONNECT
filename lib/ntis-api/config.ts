/**
 * NTIS API Configuration
 */

import { NTISConfig } from './types';

export const ntisApiConfig: NTISConfig = {
  // API Key (you'll need to replace this with your own)
  apiKey: process.env.NTIS_API_KEY || 'yx6c98kg21bu649u2m8u', // Demo key
  
  // Base URL
  baseUrl: 'https://www.ntis.go.kr/rndopen/openApi',
  
  // Timeout
  timeout: 30000, // 30 seconds
};

/**
 * Agency-specific search configurations
 */
export const agencySearchConfigs = {
  // Search for IITP (정보통신기획평가원) programs
  IITP: {
    keywords: ['정보통신', 'ICT', '소프트웨어', 'AI', '인공지능'],
    agencyName: '정보통신기획평가원',
  },
  
  // Search for TIPA (중소기업기술정보진흥원) programs
  TIPA: {
    keywords: ['중소기업', '기술혁신', '창업'],
    agencyName: '중소기업기술정보진흥원',
  },
  
  // Search for KIMST (해양수산과학기술진흥원) programs
  KIMST: {
    keywords: ['해양', '수산', '해양과학'],
    agencyName: '해양수산과학기술진흥원',
  },
  
  // Search for KEIT (한국산업기술평가관리원) programs
  KEIT: {
    keywords: ['산업기술', '산업혁신'],
    agencyName: '한국산업기술평가관리원',
  },
};

/**
 * Default search parameters
 */
export const defaultSearchParams = {
  searchRnkn: 'DATE/DESC',    // Sort by date, newest first
  startPosition: 1,
  displayCnt: 100,            // Max 100 per request
};

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  requestsPerMinute: 10,      // Max 10 requests per minute
  delayBetweenRequests: 6000, // 6 seconds between requests
};
