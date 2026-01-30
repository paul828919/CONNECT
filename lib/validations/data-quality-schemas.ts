import { z } from 'zod';

/**
 * Per-table sets of non-editable field keys.
 * These fields are stripped from PATCH requests as a defense-in-depth measure,
 * and used client-side to render fields as read-only in edit mode.
 */
export const READONLY_FIELDS: Record<string, Set<string>> = {
  'sme-programs': new Set([
    'id', 'createdAt', 'updatedAt',
    'pblancSeq', 'contentHash', 'syncedAt', 'detailPageScrapedAt',
    '_count.matches',
  ]),
  'sme-matches': new Set([
    'id', 'createdAt',
    'organizationId', 'programId',
    'score', 'scoreBreakdown', 'eligibilityLevel', 'failedCriteria', 'metCriteria',
    'sessionId', 'position', 'explanation',
    'organization.name', 'organization.type',
    'program.title', 'program.pblancSeq', 'program.status',
  ]),
  'funding-programs': new Set([
    'id', 'createdAt', 'updatedAt',
    'contentHash', 'scrapedAt',
    '_count.funding_matches',
  ]),
  'funding-matches': new Set([
    'id', 'createdAt',
    'organizationId', 'programId',
    'score', 'personalizedScore', 'personalizedAt', 'explanation',
    'organizations.name', 'organizations.type',
    'funding_programs.title', 'funding_programs.agencyId', 'funding_programs.status',
  ]),
  'users-orgs': new Set([
    'id', 'createdAt', 'updatedAt',
    'email', 'role', 'image', 'emailVerified', 'lastLoginAt',
    'name', 'linkedinUrl', 'rememberUrl', 'position', 'showOnPartnerProfile',
    'emailNotifications', 'weeklyDigest',
    'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent',
    'organization.id', 'organization.createdAt', 'organization.updatedAt',
    'organization.businessNumberEncrypted', 'organization.businessNumberHash',
    'organization.verifiedAt', 'organization.verificationStatus',
    'organization.profileCompleted', 'organization.profileScore',
    'subscriptions.plan', 'subscriptions.status', 'subscriptions.billingCycle',
    'subscriptions.startedAt', 'subscriptions.expiresAt',
  ]),
};

/**
 * Enum options for dropdown fields, keyed by `tableName.fieldKey`.
 */
export const ENUM_OPTIONS: Record<string, string[]> = {
  // SME Programs
  'sme-programs.status': ['ACTIVE', 'EXPIRED', 'ARCHIVED'],
  'sme-programs.eligibilityConfidence': ['HIGH', 'MEDIUM', 'LOW'],
  // Funding Programs
  'funding-programs.status': ['ACTIVE', 'EXPIRED', 'ARCHIVED'],
  'funding-programs.agencyId': ['IITP', 'KEIT', 'TIPA', 'KIMST', 'NTIS'],
  'funding-programs.announcementType': ['R_D_PROJECT', 'SURVEY', 'EVENT', 'NOTICE', 'UNKNOWN'],
  'funding-programs.eligibilityConfidence': ['HIGH', 'MEDIUM', 'LOW'],
  'funding-programs.programIntent': ['BASIC_RESEARCH', 'APPLIED_RESEARCH', 'COMMERCIALIZATION', 'INFRASTRUCTURE', 'POLICY_SUPPORT'],
  // Users-Orgs (organization fields)
  'users-orgs.organization.type': ['COMPANY', 'RESEARCH_INSTITUTE', 'UNIVERSITY', 'PUBLIC_INSTITUTION'],
  'users-orgs.organization.status': ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DEACTIVATED'],
  'users-orgs.organization.employeeCount': ['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300'],
  'users-orgs.organization.revenueRange': ['NONE', 'UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B'],
  'users-orgs.organization.businessStructure': ['CORPORATION', 'SOLE_PROPRIETOR', 'GOVERNMENT_AGENCY'],
};

// Helper: nullable string
const optStr = z.string().nullable().optional();
const optInt = z.number().int().nullable().optional();
const optBigInt = z.union([z.number(), z.string()]).nullable().optional();
const optFloat = z.number().nullable().optional();
const optBool = z.boolean().nullable().optional();
const optDate = z.string().nullable().optional(); // ISO date strings
const optStrArr = z.array(z.string()).optional();
const optJson = z.any().optional();

/**
 * SME Programs patch schema — all editable fields as optional.
 */
export const smeProgramPatchSchema = z.object({
  title: z.string().min(1).optional(),
  detailBsnsNm: optStr,
  description: optStr,
  supportScale: optStr,
  supportContents: optStr,
  supportTarget: optStr,
  applicationMethod: optStr,
  // Organization & Contact
  supportInstitution: optStr,
  supportInstitutionCd: optStr,
  contactInfo: optStr,
  contactUrl: optStr,
  contactDept: optStr,
  contactTel: optStr,
  linkedInstitution: optStr,
  linkedInstitutionCd: optStr,
  // URLs & Attachments
  detailUrl: optStr,
  applicationUrl: optStr,
  attachmentUrls: optStrArr,
  attachmentNames: optStrArr,
  announcementFileUrl: optStr,
  announcementFileName: optStr,
  // Dates
  applicationStart: optDate,
  applicationEnd: optDate,
  apiCreatedAt: optDate,
  apiUpdatedAt: optDate,
  // Classification
  bizType: optStr,
  bizTypeCd: optStr,
  sportType: optStr,
  sportTypeCd: optStr,
  lifeCycle: optStrArr,
  lifeCycleCd: optStrArr,
  // Target Eligibility
  targetRegions: optStrArr,
  targetRegionCodes: optStrArr,
  targetCompanyScale: optStrArr,
  targetCompanyScaleCd: optStrArr,
  targetSalesRange: optStrArr,
  targetSalesRangeCd: optStrArr,
  minSalesAmount: optBigInt,
  maxSalesAmount: optBigInt,
  targetEmployeeRange: optStrArr,
  targetEmployeeRangeCd: optStrArr,
  minEmployeeCount: optInt,
  maxEmployeeCount: optInt,
  targetBusinessAge: optStrArr,
  targetBusinessAgeCd: optStrArr,
  minBusinessAge: optInt,
  maxBusinessAge: optInt,
  targetCeoAge: optInt,
  minCeoAge: optInt,
  maxCeoAge: optInt,
  targetIndustry: optStr,
  requiredCerts: optStrArr,
  requiredCertsCd: optStrArr,
  // Financial
  minSupportAmount: optBigInt,
  maxSupportAmount: optBigInt,
  minInterestRate: optFloat,
  maxInterestRate: optFloat,
  // Special Flags
  isRestart: optBool,
  isPreStartup: optBool,
  isFemaleOwner: optBool,
  // Metadata
  status: z.enum(['ACTIVE', 'EXPIRED', 'ARCHIVED']).optional(),
  eligibilityConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
}).strict();

/**
 * Funding Programs patch schema
 */
export const fundingProgramPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: optStr,
  agencyId: z.enum(['IITP', 'KEIT', 'TIPA', 'KIMST', 'NTIS']).optional(),
  announcementUrl: z.string().url().optional(),
  targetType: optStrArr,
  minTrl: optInt,
  maxTrl: optInt,
  eligibilityCriteria: optJson,
  budgetAmount: optBigInt,
  fundingPeriod: optStr,
  deadline: optDate,
  category: optStr,
  keywords: optStrArr,
  status: z.enum(['ACTIVE', 'EXPIRED', 'ARCHIVED']).optional(),
  publishedAt: optDate,
  applicationStart: optDate,
  lastCheckedAt: optDate,
  scrapingSource: optStr,
  announcementType: z.enum(['R_D_PROJECT', 'SURVEY', 'EVENT', 'NOTICE', 'UNKNOWN']).optional(),
  announcingAgency: optStr,
  ministry: optStr,
  trlClassification: optJson,
  trlConfidence: optStr,
  allowedBusinessStructures: optStrArr,
  attachmentUrls: optStrArr,
  trlInferred: optBool,
  // Eligibility
  requiredCertifications: optStrArr,
  preferredCertifications: optStrArr,
  requiredMinEmployees: optInt,
  requiredMaxEmployees: optInt,
  requiredMinRevenue: optBigInt,
  requiredMaxRevenue: optBigInt,
  requiredInvestmentAmount: optFloat,
  requiredOperatingYears: optInt,
  maxOperatingYears: optInt,
  requiresResearchInstitute: optBool,
  eligibilityConfidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  manualReviewRequired: optBool,
  manualReviewNotes: optStr,
  manualReviewCompletedAt: optDate,
  manualReviewCompletedBy: optStr,
  // Semantic enrichment
  primaryTargetIndustry: optStr,
  secondaryTargetIndustries: optStrArr,
  semanticSubDomain: optJson,
  technologyDomainsSpecific: optStrArr,
  targetCompanyProfile: optStr,
  programIntent: z.enum(['BASIC_RESEARCH', 'APPLIED_RESEARCH', 'COMMERCIALIZATION', 'INFRASTRUCTURE', 'POLICY_SUPPORT']).nullable().optional(),
  semanticConfidence: optFloat,
  semanticEnrichedAt: optDate,
  semanticEnrichmentModel: optStr,
}).strict();

/**
 * SME Matches patch schema — only user-action fields editable
 */
export const smeMatchPatchSchema = z.object({
  viewed: optBool,
  saved: optBool,
  notificationSent: optBool,
  deletedAt: optDate,
}).strict();

/**
 * Funding Matches patch schema — only user-action fields editable
 */
export const fundingMatchPatchSchema = z.object({
  viewed: optBool,
  saved: optBool,
  notificationSent: optBool,
  deletedAt: optDate,
}).strict();

/**
 * Organization patch schema — organization-level editable fields
 * Used for users-orgs table where we edit the organization record.
 */
export const organizationPatchSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['COMPANY', 'RESEARCH_INSTITUTE', 'UNIVERSITY', 'PUBLIC_INSTITUTION']).optional(),
  businessStructure: z.enum(['CORPORATION', 'SOLE_PROPRIETOR', 'GOVERNMENT_AGENCY']).nullable().optional(),
  description: optStr,
  website: optStr,
  logoUrl: optStr,
  industrySector: optStr,
  employeeCount: z.enum(['UNDER_10', 'FROM_10_TO_50', 'FROM_50_TO_100', 'FROM_100_TO_300', 'OVER_300']).nullable().optional(),
  revenueRange: z.enum(['NONE', 'UNDER_1B', 'FROM_1B_TO_10B', 'FROM_10B_TO_50B', 'FROM_50B_TO_100B', 'OVER_100B']).nullable().optional(),
  rdExperience: optBool,
  technologyReadinessLevel: optInt,
  targetResearchTRL: optInt,
  targetResearchTRLMin: optInt,
  targetResearchTRLMax: optInt,
  researchFocusAreas: optStrArr,
  annualRdBudget: optStr,
  researcherCount: optInt,
  keyTechnologies: optStrArr,
  collaborationCount: optInt,
  primaryContactName: optStr,
  primaryContactEmail: optStr,
  primaryContactPhone: optStr,
  address: optStr,
  desiredConsortiumFields: optStrArr,
  desiredTechnologies: optStrArr,
  targetPartnerTRL: optInt,
  commercializationCapabilities: optStrArr,
  expectedTRLLevel: optInt,
  status: z.enum(['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DEACTIVATED']).optional(),
  certifications: optStrArr,
  governmentCertifications: optStrArr,
  industryAwards: optStrArr,
  hasResearchInstitute: optBool,
  verificationNotes: optStr,
  primaryBusinessDomain: optStr,
  semanticSubDomain: optJson,
  technologyDomainsSpecific: optStrArr,
  companyProfileDescription: optStr,
}).strict();

/**
 * Map of table slug → Zod schema for PATCH validation.
 */
export const PATCH_SCHEMAS: Record<string, z.ZodObject<any>> = {
  'sme-programs': smeProgramPatchSchema,
  'sme-matches': smeMatchPatchSchema,
  'funding-programs': fundingProgramPatchSchema,
  'funding-matches': fundingMatchPatchSchema,
  'users-orgs': organizationPatchSchema,
};
