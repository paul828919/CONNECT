/**
 * NTIS API Type Definitions
 */

// NTIS API Configuration
export interface NTISConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
}

// Search Parameters
export interface NTISSearchParams {
  SRWR?: string;              // Search query
  userId?: string;            // User ID (optional)
  searchFd?: string;          // Search field (BI, TI, AU, OG, PB, KW, AB)
  addQuery?: string;          // Additional query filters
  searchRnkn?: string;        // Sort order (RANK/DESC, DATE/DESC, etc.)
  startPosition?: number;     // Start position (default: 1)
  displayCnt?: number;        // Display count (default: 100, max: 100)
}

// API Response
export interface NTISSearchResponse {
  success: boolean;
  data?: string;              // Raw XML data
  error?: string;
  totalHits: number;
  searchTime: number;
}

// Parsed Response
export interface NTISParsedResponse {
  programs: NTISProgram[];
  totalHits: number;
  searchTime: number;
}

// R&D Program Data
export interface NTISProgram {
  // Basic info
  projectNumber: string | null;
  titleKorean: string | null;
  titleEnglish: string | null;
  
  // People
  manager: string | null;
  researchers: string[];
  
  // Content
  goal: string | null;
  abstract: string | null;
  effect: string | null;
  
  // Keywords
  keywordsKorean: string[];
  keywordsEnglish: string[];
  
  // Organizations
  orderAgency: string | null;
  researchAgency: string | null;
  manageAgency: string | null;
  ministry: string | null;
  
  // Budget
  governmentFunds: number | null;
  sbusinessFunds: number | null;
  totalFunds: number | null;
  
  // Project details
  budgetProject: string | null;
  businessName: string | null;
  bigprojectTitle: string | null;
  
  // Dates
  projectYear: number | null;
  startDate: string | null;
  endDate: string | null;
  
  // Classification
  scienceClass: any[];
  sixTechnology: string | null;
  performAgent: string | null;
  developmentPhases: string | null;
  
  // Other
  region: string | null;
  continuousFlag: string | null;
  policyProjectFlag: string | null;
  
  // Metadata
  scrapedAt: Date;
  source: 'NTIS_API';
}

// Search Field Options
export enum NTISSearchField {
  ALL = 'BI',                 // All fields
  TITLE = 'TI',               // Project title
  RESEARCHER = 'AU',          // Researcher name
  ORDER_AGENCY = 'OG',        // Order agency
  PERFORM_AGENCY = 'PB',      // Performing agency
  KEYWORD = 'KW',             // Keywords
  ABSTRACT = 'AB',            // Abstract
}

// Sort Options
export enum NTISSortOrder {
  RANK_DESC = 'RANK/DESC',
  RANK_ASC = 'RANK/ASC',
  DATE_DESC = 'DATE/DESC',
  DATE_ASC = 'DATE/ASC',
}

// Agency Mapping (for scraper integration)
export const NTIS_AGENCY_MAPPING: Record<string, string> = {
  'IITP': '정보통신기획평가원',
  'TIPA': '중소기업기술정보진흥원',
  'KIMST': '해양수산과학기술진흥원',
  'KEIT': '한국산업기술평가관리원',
};
