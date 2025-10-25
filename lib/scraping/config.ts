/**
 * Scraping Configuration
 *
 * Agency-specific scraping configurations for 4 NTIS agencies:
 * - IITP (정보통신기획평가원)
 * - KEIT (한국산업기술평가관리원)
 * - TIPA (중소기업기술정보진흥원)
 * - KIMST (해양수산과학기술진흥원)
 */

export interface AgencyConfig {
  id: string;
  name: string;
  baseUrl: string;
  listingPath: string;
  selectors: {
    announcementList: string;
    title: string;
    link: string;
    date?: string;
    category?: string;
    status?: string;
    // NTIS-specific list page columns
    ntisId?: string;      // 순번 (Announcement ID)
    ministry?: string;    // 부처명 (Ministry name)
    startDate?: string;   // 접수일 (Start date)
    deadline?: string;    // 마감일 (Deadline)
    dday?: string;        // D-day countdown
  };
  pagination?: {
    enabled: boolean;
    maxPages?: number;
    selector?: string;
    type?: 'click' | 'query-param';
  };
  rateLimit: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
  };
  timeout: number;
}

/**
 * IITP Configuration
 * 정보통신기획평가원 - ICT sector funding (~15% of budget)
 */
export const iitpConfig: AgencyConfig = {
  id: 'iitp',
  name: '정보통신기획평가원',
  baseUrl: 'https://www.iitp.kr',
  listingPath: '/kr/1/business/businessApiView.it',
  selectors: {
    announcementList: 'table tbody tr',
    title: 'td:nth-child(2) a',
    link: 'td:nth-child(2) a',
    date: 'td:nth-child(3)',
    category: 'td.category',
  },
  pagination: {
    enabled: true,
    maxPages: 3, // Scrape last 3 pages
    selector: '.pagination a',
    type: 'click',
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000, // 6 seconds
  },
  timeout: 30000,
};

/**
 * KEIT Configuration
 * 한국산업기술평가관리원 - Industrial technology (~12% of budget)
 * NOTE: KEIT uses a custom div-based layout (not tables) - requires special handling
 * Temporarily disabled until custom extraction logic is implemented
 */
export const keitConfig: AgencyConfig = {
  id: 'keit',
  name: '한국산업기술평가관리원',
  baseUrl: 'https://srome.keit.re.kr',
  listingPath: '/srome/biz/perform/opnnPrpsl/retrieveTaskAnncmListView.do?prgmId=XPG201040000',
  selectors: {
    // KEIT uses custom div layout - these selectors don't work
    announcementList: '.board_list li',
    title: '.subject',
    link: '.subject a',
    date: '.period',
    status: '.status',
  },
  pagination: {
    enabled: true,
    maxPages: 2,
    selector: '.paging a',
    type: 'click',
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  },
  timeout: 30000,
};

/**
 * TIPA Configuration
 * 중소기업기술정보진흥원 - SME support (~8% of budget)
 */
export const tipaConfig: AgencyConfig = {
  id: 'tipa',
  name: '중소기업기술정보진흥원',
  baseUrl: 'https://www.smtech.go.kr',
  listingPath: '/front/ifg/no/notice02_list.do',
  selectors: {
    announcementList: 'table tbody tr',
    title: 'td:nth-child(3) a',
    link: 'td:nth-child(3) a',
    date: 'td:nth-child(4)',
  },
  pagination: {
    enabled: true,
    maxPages: 2,
    type: 'query-param',
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  },
  timeout: 30000,
};

/**
 * KIMST Configuration
 * 해양수산과학기술진흥원 - Maritime technology (~5% of budget)
 */
export const kimstConfig: AgencyConfig = {
  id: 'kimst',
  name: '해양수산과학기술진흥원',
  baseUrl: 'https://www.kimst.re.kr',
  listingPath: '/u/news/inform_01/pjtAnuc.do',
  selectors: {
    announcementList: 'table tbody tr',
    title: 'td:nth-child(2) a',
    link: 'td:nth-child(2) a',
    date: 'td:nth-child(4)',
    category: 'td.category',
  },
  pagination: {
    enabled: false, // Only scrape first page
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000,
  },
  timeout: 30000,
};

/**
 * NTIS Announcement Page Configuration
 * NTIS 국가R&D통합공고 - PRIMARY source for all Korean R&D announcements
 * Source: https://www.ntis.go.kr/rndgate/eg/un/ra/mng.do
 * Note: 75,490 total announcements across 7,549 pages
 */
export const ntisConfig: AgencyConfig = {
  id: 'ntis',
  name: 'NTIS 국가R&D통합공고',
  baseUrl: 'https://www.ntis.go.kr',
  listingPath: '/rndgate/eg/un/ra/mng.do',
  selectors: {
    // Target table.basic_list (Table 4) which contains announcement rows
    announcementList: 'table.basic_list tbody tr',
    title: 'td:nth-child(4) a', // 4th column = 공고명 (announcement title) with link
    link: 'td:nth-child(4) a',  // 4th column = detail page link
    date: 'td:nth-child(7)',    // 7th column = 마감일 (deadline, not published date)
    // NTIS list page columns (extract all 8 columns from the table)
    ntisId: 'td:nth-child(2)',      // 2nd column = 순번 (Announcement ID)
    status: 'td:nth-child(3)',      // 3rd column = 현황 (접수중/마감 status)
    ministry: 'td:nth-child(5)',    // 5th column = 부처명 (Ministry name)
    startDate: 'td:nth-child(6)',   // 6th column = 접수일 (Start date)
    deadline: 'td:nth-child(7)',    // 7th column = 마감일 (Deadline) ⭐ KEY FIELD
    dday: 'td:nth-child(8)',        // 8th column = D-day countdown (e.g., "D-7")
  },
  pagination: {
    enabled: true,
    maxPages: 10, // Scrape first 10 pages (100 announcements)
    type: 'query-param', // Uses pageIndex parameter
  },
  rateLimit: {
    requestsPerMinute: 10,
    delayBetweenRequests: 6000, // 6 seconds (respectful scraping)
  },
  timeout: 30000,
};

/**
 * Combined scraping configuration
 */
export const scrapingConfig = {
  iitp: iitpConfig,
  keit: keitConfig,
  tipa: tipaConfig,
  kimst: kimstConfig,
  ntis: ntisConfig,
};

/**
 * Get agency configuration by ID
 */
export function getAgencyConfig(agencyId: string): AgencyConfig | null {
  const config = scrapingConfig[agencyId.toLowerCase() as keyof typeof scrapingConfig];
  return config || null;
}

/**
 * Get all agency configurations
 */
export function getAllAgencyConfigs(): AgencyConfig[] {
  return Object.values(scrapingConfig);
}
