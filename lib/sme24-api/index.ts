/**
 * SME24 API Module
 *
 * 중소벤처24 Open API integration for:
 * - SME support program announcements (민간공고목록정보)
 * - Certificate verification (이노비즈, 벤처기업, 메인비즈)
 *
 * @module lib/sme24-api
 */

// Configuration
export {
  sme24Config,
  rateLimitConfig,
  CERTIFICATE_ENDPOINTS,
  API_RESPONSE_CODES,
  validateConfig,
  type SME24Config,
} from './config';

// Types
export {
  // Announcement types
  type SME24AnnouncementListResponse,
  type SME24AnnouncementItem,
  type SME24SearchParams,
  type SME24ApiResponse,

  // Certificate types
  type CertificateVerifyRequest,
  type CertificateVerifyResult,
  type InnoBizCertificateResponse,
  type VentureCertificateResponse,
  type MainBizCertificateResponse,
  type OrganizationCertificationResult,

  // Code mappings
  COMPANY_SCALE_CODES,
  SALES_AMOUNT_CODES,
  EMPLOYEE_COUNT_CODES,
  BUSINESS_AGE_CODES,
  CERTIFICATION_CODES,
  REGION_CODES,
} from './types';

// API Client
export { SME24Client, sme24Client } from './client';

// Certificate Service
export {
  verifyOrganizationCertifications,
  getCertificationStatus,
  shouldVerifyCertifications,
  verifySingleCertificate,
} from './certificate-service';

// Program Service
export {
  syncSMEPrograms,
  dailySync,
  getSyncStats,
  getActivePrograms,
  getProgramById,
  getProgramByPblancSeq,
  type SyncResult,
} from './program-service';

// Mappers
export {
  mapSME24ToSMEProgram,
  mapSME24ToSMEProgramUpdate,
  mapSME24Programs,
} from './mappers/program-mapper';

export {
  CodeMapper,
  mapCompanyScaleToCode,
  mapRevenueToCode,
  mapEmployeeCountToCode,
  mapCertificationsToCode,
  mapRegionToCode,
  checkCertificationEligibility,
  checkRegionEligibility,
  checkRevenueEligibility,
  calculateBusinessAge,
  mapBusinessAgeToCode,
} from './mappers/code-mapper';
