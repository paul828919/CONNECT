/**
 * Shared completeness computation utilities for SME and Funding programs.
 * Extracted from individual route files to be reused by list routes and duplicate detection.
 */

export const SME_COMPLETENESS_FIELDS = [
  'description',
  'supportScale',
  'supportContents',
  'supportTarget',
  'applicationMethod',
  'supportInstitution',
  'contactInfo',
  'detailUrl',
  'applicationUrl',
  'applicationStart',
  'applicationEnd',
  'bizType',
  'sportType',
  'targetRegions',
  'targetCompanyScale',
  'targetSalesRange',
  'targetEmployeeRange',
  'targetBusinessAge',
  'requiredCerts',
  'minSupportAmount',
  'maxSupportAmount',
  'detailPageText',
  'detailPageDocumentText',
] as const;

export const FUNDING_COMPLETENESS_FIELDS = [
  'description',
  'announcementUrl',
  'targetType',
  'minTrl',
  'maxTrl',
  'eligibilityCriteria',
  'budgetAmount',
  'fundingPeriod',
  'deadline',
  'category',
  'keywords',
  'applicationStart',
  'requiredCertifications',
  'primaryTargetIndustry',
  'programIntent',
  'semanticSubDomain',
  'technologyDomainsSpecific',
  'targetCompanyProfile',
] as const;

export function computeCompleteness(
  row: any,
  fields: readonly string[]
): { percent: number; filled: number; total: number } {
  const total = fields.length;
  let filled = 0;
  for (const field of fields) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) filled++;
    } else {
      filled++;
    }
  }
  return { percent: Math.round((filled / total) * 100), filled, total };
}

/** Convert BigInt/Decimal/Date to JSON-safe types */
export function serializeRow(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (typeof obj === 'object' && obj.constructor?.name === 'Decimal') return Number(obj);
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serializeRow);
  if (typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeRow(v);
    }
    return out;
  }
  return obj;
}
