/**
 * Tier 1 Pattern Registry — Consolidated Regex Extraction Patterns
 *
 * All rule-based (zero-cost) extraction patterns for Korean R&D announcements.
 * Consolidated from:
 *   - two-tier-extractor.ts (deadline, publishedAt, applicationStart helpers)
 *   - ntis-announcement-parser.ts (budget, eligibility, business structures)
 *   - enrich-program-from-pdf.ts (Sections A-D field reference)
 *
 * Structure:
 *   PatternRule[] with field, patterns, postProcess, and confidence level.
 *
 * Used by ThreeTierExtractor:
 *   1. Run all Tier 1 patterns on announcement text
 *   2. Identify null/LOW fields
 *   3. Pass failed field groups to Tier 2 (Haiku)
 */

import { parseKoreanDate } from './utils';

// ============================================================================
// Types
// ============================================================================

export type Tier1Field =
  // Dates & Operations (Group A)
  | 'applicationStart'
  | 'deadline'
  | 'deadlineTimeRule'
  | 'publishedAt'
  | 'submissionSystem'
  | 'contactInfo'
  // Budget & Duration (Group B)
  | 'budgetAmount'
  | 'budgetPerProject'
  | 'fundingRate'
  | 'fundingPeriod'
  | 'numAwards'
  // Eligibility (Group C)
  | 'targetType'
  | 'leadRoleAllowed'
  | 'coRoleAllowed'
  | 'requiresResearchInstitute'
  | 'requiredCertifications'
  | 'exclusionRules'
  // Domain & Keywords (Group D)
  | 'keywords'
  | 'primaryTargetIndustry'
  | 'semanticSubDomain';

export type FieldGroup = 'A' | 'B' | 'C' | 'D';

export interface PatternRule {
  field: Tier1Field;
  group: FieldGroup;
  /** Regex patterns to try in order — first match wins */
  patterns: RegExp[];
  /** Post-process the match result into the desired value type */
  postProcess: (match: RegExpMatchArray, fullText: string) => any;
  /** Confidence when this regex match succeeds */
  confidence: 'HIGH' | 'MEDIUM';
  /** Human-readable description for logging */
  description: string;
}

export interface Tier1Result {
  field: Tier1Field;
  group: FieldGroup;
  value: any;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  matchedPattern?: string;
}

// ============================================================================
// Field → Group Mapping
// ============================================================================

export const FIELD_GROUP_MAP: Record<Tier1Field, FieldGroup> = {
  // Group A: Dates & Operations
  applicationStart: 'A',
  deadline: 'A',
  deadlineTimeRule: 'A',
  publishedAt: 'A',
  submissionSystem: 'A',
  contactInfo: 'A',
  // Group B: Budget & Duration
  budgetAmount: 'B',
  budgetPerProject: 'B',
  fundingRate: 'B',
  fundingPeriod: 'B',
  numAwards: 'B',
  // Group C: Eligibility
  targetType: 'C',
  leadRoleAllowed: 'C',
  coRoleAllowed: 'C',
  requiresResearchInstitute: 'C',
  requiredCertifications: 'C',
  exclusionRules: 'C',
  // Group D: Domain & Keywords
  keywords: 'D',
  primaryTargetIndustry: 'D',
  semanticSubDomain: 'D',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse Korean budget amount to number (in won)
 * Handles: "52억원" → 5,200,000,000 / "300백만원" → 300,000,000
 */
function parseBudgetToWon(amountStr: string, unitStr: string): number | null {
  const cleaned = amountStr.replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;

  switch (unitStr) {
    case '억': return Math.round(num * 100_000_000);
    case '백만': return Math.round(num * 1_000_000);
    case '천만': return Math.round(num * 10_000_000);
    case '만': return Math.round(num * 10_000);
    default: return null;
  }
}

// ============================================================================
// Pattern Registry
// ============================================================================

export const TIER1_PATTERNS: PatternRule[] = [
  // ========================================================================
  // GROUP A: Dates & Operations
  // ========================================================================

  // --- Deadline ---
  {
    field: 'deadline',
    group: 'A',
    patterns: [
      /(?:마감일|신청마감일|지원마감일|모집마감일|접수마감일|신청기한|접수기한|제출마감)\s*[:：]\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/i,
      /(?:마감일|신청마감일|지원마감일|모집마감일|접수마감일|신청기한|접수기한|제출마감)\s*[:：]\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return parseKoreanDate(match[1]);
    },
    confidence: 'HIGH',
    description: 'Deadline from synonym matching (마감일, 신청기한, etc.)',
  },

  // --- Published At ---
  {
    field: 'publishedAt',
    group: 'A',
    patterns: [
      /공고일\s*[:：]\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/i,
      /공고일\s*[:：]\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      const date = parseKoreanDate(match[1]);
      if (date && date <= new Date()) return date;
      return null;
    },
    confidence: 'HIGH',
    description: 'Published date (공고일)',
  },

  // --- Application Start ---
  {
    field: 'applicationStart',
    group: 'A',
    patterns: [
      /(?:접수일|신청일|모집일|접수시작일|신청시작일|접수개시일)\s*[:：]\s*(\d{4}[.-]\d{1,2}[.-]\d{1,2})/i,
      /(?:접수일|신청일|모집일|접수시작일|신청시작일|접수개시일)\s*[:：]\s*(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return parseKoreanDate(match[1]);
    },
    confidence: 'HIGH',
    description: 'Application start date (접수일, 신청시작일, etc.)',
  },

  // --- Deadline Time Rule (NEW) ---
  {
    field: 'deadlineTimeRule',
    group: 'A',
    patterns: [
      // "18:00까지", "17시까지 접수 마감", "오후 6시까지"
      /(\d{1,2}[:시]\s*\d{0,2})\s*까지\s*(?:접수|제출|마감)/i,
      /(?:접수|제출)\s*마감\s*[:：]?\s*(\d{1,2}[:시]\s*\d{0,2})\s*까지/i,
      /(?:마감\s*시간|접수\s*시간)\s*[:：]\s*(.{3,30})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return match[1].trim();
    },
    confidence: 'MEDIUM',
    description: 'Deadline time rule (18:00까지, 17시까지, etc.)',
  },

  // --- Submission System (NEW) ---
  {
    field: 'submissionSystem',
    group: 'A',
    patterns: [
      // Named systems
      /(?:접수\s*(?:시스템|방법|처)|제출\s*(?:시스템|방법|처))\s*[:：]\s*(.{3,60})/i,
      // Specific known systems
      /(IRIS|범부처통합혁신사업관리시스템|이지비즈|K-Startup|RCMS|e-R&D|한국연구재단\s*시스템|ERND)/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return match[1].trim();
    },
    confidence: 'MEDIUM',
    description: 'Submission system (IRIS, 이지비즈, K-Startup, etc.)',
  },

  // --- Contact Info (NEW) ---
  {
    field: 'contactInfo',
    group: 'A',
    patterns: [
      // "문의처 : 한국연구재단 02-3460-5500"
      /문의처\s*[:：]\s*(.{5,100})/i,
      // "담당부서 : 기술사업화팀 (02-1234-5678)"
      /담당\s*(?:부서|자)\s*[:：]\s*(.{5,100})/i,
      // Phone number in context
      /(?:전화|연락처|문의)\s*[:：]?\s*((?:\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}).*)/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      // Trim to first line break or 100 chars
      const raw = match[1].trim();
      const firstLine = raw.split(/[\n\r]/)[0];
      return firstLine.substring(0, 100);
    },
    confidence: 'MEDIUM',
    description: 'Contact information (문의처, 담당부서, phone number)',
  },

  // ========================================================================
  // GROUP B: Budget & Duration
  // ========================================================================

  // --- Budget Amount ---
  // Note: Budget extraction is complex (semantic analysis needed).
  // This pattern handles the most common straightforward cases.
  // Complex cases (multi-track, total vs per-project) fall to existing
  // extractBudgetSemantic() or Tier 2.
  {
    field: 'budgetAmount',
    group: 'B',
    patterns: [
      // "공고금액 : 52억원" or "지원규모 : 300백만원"
      /(?:공고금액|지원규모|지원예산|지원금액|연구비|총사업비)\s*[:：]\s*(?:총\s*)?([\d,\.]+)\s*(억|백만|천만|만)원/i,
      // "금 액 : 45,000,000원" (direct amount in won)
      /금\s*액\s*[:：]\s*([\d,]+)원/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      // Direct won amount (금액 pattern)
      if (match[0].includes('금') && match[0].includes('액') && !match[2]) {
        const cleaned = match[1].replace(/,/g, '');
        const amount = parseInt(cleaned, 10);
        return amount > 0 && amount < 1_000_000_000_000 ? amount : null;
      }
      // Korean unit amount
      if (match[2]) {
        return parseBudgetToWon(match[1], match[2]);
      }
      return null;
    },
    confidence: 'HIGH',
    description: 'Budget amount from synonym-prefixed patterns',
  },

  // --- Budget Per Project (NEW) ---
  {
    field: 'budgetPerProject',
    group: 'B',
    patterns: [
      // "과제당 연간 300백만원" or "과제당 5억원"
      /과제당\s*(?:연간\s*)?([\d,\.]+)\s*(억|백만|천만|만)원/i,
      // "최대 5억원" (per-applicant max)
      /최대\s*([\d,\.]+)\s*(억|백만|천만|만)원/i,
    ],
    postProcess: (match) => {
      if (!match[1] || !match[2]) return null;
      return parseBudgetToWon(match[1], match[2]);
    },
    confidence: 'MEDIUM',
    description: 'Per-project budget (과제당, 최대)',
  },

  // --- Funding Rate (NEW) ---
  {
    field: 'fundingRate',
    group: 'B',
    patterns: [
      // "정부 75%, 민간 25%" or "정부출연금 75%"
      /(?:정부|출연금|지원)\s*(\d{1,3})\s*%\s*[,，]?\s*(?:민간|기업|대응자금)\s*(\d{1,3})\s*%/i,
      // "대응자금 25%" (matching fund ratio)
      /대응자금\s*(\d{1,3})\s*%/i,
      // "정부지원금비율 : 75%"
      /(?:정부\s*지원\s*(?:금\s*)?비율|출연\s*비율|지원\s*비율)\s*[:：]?\s*(\d{1,3})\s*%/i,
    ],
    postProcess: (match) => {
      // Full ratio format: "정부 75%, 민간 25%"
      if (match[2]) {
        return `정부 ${match[1]}%, 민간 ${match[2]}%`;
      }
      // Single percentage
      if (match[1]) {
        if (match[0].includes('대응자금')) {
          const govRate = 100 - parseInt(match[1]);
          return `정부 ${govRate}%, 민간 ${match[1]}%`;
        }
        return `정부 ${match[1]}%`;
      }
      return null;
    },
    confidence: 'MEDIUM',
    description: 'Funding rate (정부/민간 ratio)',
  },

  // --- Funding Period (NEW) ---
  {
    field: 'fundingPeriod',
    group: 'B',
    patterns: [
      // "연구기간 : 2년" or "사업기간 : 36개월"
      /(?:연구기간|사업기간|지원기간|수행기간|과제기간)\s*[:：]\s*([\d]+\s*(?:년|개월|월))/i,
      // "최대 5년" or "2~3년"
      /(?:최대|최장)\s*([\d]+\s*(?:년|개월|월))/i,
      // "2년~3년" or "24개월~36개월"
      /([\d]+)\s*(?:년|개월)\s*[~～\-]\s*([\d]+)\s*(년|개월)/i,
    ],
    postProcess: (match) => {
      // Range format: "2년~3년"
      if (match[2] && match[3]) {
        return `${match[1]}${match[3]}~${match[2]}${match[3]}`;
      }
      if (match[1]) return match[1].trim();
      return null;
    },
    confidence: 'MEDIUM',
    description: 'Funding period (연구기간, 사업기간)',
  },

  // --- Number of Awards (NEW) ---
  {
    field: 'numAwards',
    group: 'B',
    patterns: [
      // "12개 과제" or "10개 내외"
      /(\d+)\s*개\s*(?:과제|내외|선정|팀)/i,
      // "선정규모 : 12개"
      /(?:선정\s*규모|과제\s*수|선정\s*건수)\s*[:：]\s*(\d+)/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return parseInt(match[1], 10);
    },
    confidence: 'MEDIUM',
    description: 'Number of awards (선정규모, 과제 수)',
  },

  // ========================================================================
  // GROUP C: Eligibility
  // ========================================================================

  // --- Lead Role Allowed (NEW) ---
  {
    field: 'leadRoleAllowed',
    group: 'C',
    patterns: [
      // "주관기관 : 중소기업, 중견기업"
      /주관\s*기관\s*[:：]\s*(.{3,80})/i,
      // "주관연구기관은 중소기업"
      /주관\s*(?:연구)?기관\s*(?:은|는)\s*(.{3,60})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      // Split by commas/semicolons and clean
      return match[1].split(/[,;，；·]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s.length < 20);
    },
    confidence: 'MEDIUM',
    description: 'Lead role requirements (주관기관)',
  },

  // --- Co-Role Allowed (NEW) ---
  {
    field: 'coRoleAllowed',
    group: 'C',
    patterns: [
      // "참여기관 : 대학, 연구기관"
      /(?:참여기관|공동연구기관|협동연구기관)\s*[:：]\s*(.{3,80})/i,
      // "공동연구: 대학"
      /공동\s*연구\s*[:：]?\s*(.{3,60})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return match[1].split(/[,;，；·]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s.length < 20);
    },
    confidence: 'MEDIUM',
    description: 'Co-research role requirements (참여기관, 공동연구)',
  },

  // --- Required Certifications ---
  {
    field: 'requiredCertifications',
    group: 'C',
    patterns: [
      // Explicit certification mentions
      /(INNO-BIZ|이노비즈|벤처기업|메인비즈|Main-Biz|경영혁신형기업)/gi,
      // "필요인증 : ..." format
      /(?:필요\s*인증|요구\s*인증|자격\s*요건)\s*[:：]\s*(.{3,100})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      if (typeof match[1] === 'string' && match[1].length > 20) {
        // Multi-value field from "필요인증: ..." format
        return match[1].split(/[,;，；·]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
      }
      return [match[1].trim()];
    },
    confidence: 'MEDIUM',
    description: 'Required certifications (INNO-BIZ, 벤처기업, etc.)',
  },

  // --- Exclusion Rules (NEW) ---
  {
    field: 'exclusionRules',
    group: 'C',
    patterns: [
      // "제외대상" or "신청제외" section
      /(?:제외\s*대상|신청\s*제외|참여\s*제한|지원\s*제외)\s*[:：]\s*(.{10,200})/i,
      // Specific exclusion patterns
      /((?:\d+년\s*이내\s*(?:부정행위|부정당\s*업자|참여\s*제한))[^.。\n]{0,80})/i,
      // "휴/폐업 기업"
      /(휴[·\/]?폐업\s*기업[^.。\n]{0,30})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      const raw = match[1].trim();
      // Split multi-rule exclusions
      const rules = raw.split(/[,;，；]/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 2);
      return rules.length > 0 ? rules : [raw];
    },
    confidence: 'MEDIUM',
    description: 'Exclusion rules (제외대상, 참여제한)',
  },

  // --- Requires Research Institute ---
  {
    field: 'requiresResearchInstitute',
    group: 'C',
    patterns: [
      /(컨소시엄\s*(?:필수|구성\s*필수|의무))/i,
      /(산학연\s*(?:협력|컨소시엄)\s*(?:필수|의무))/i,
    ],
    postProcess: (match) => {
      return !!match[1];
    },
    confidence: 'MEDIUM',
    description: 'Consortium/research institute requirement',
  },

  // --- Target Type ---
  {
    field: 'targetType',
    group: 'C',
    patterns: [
      /(?:지원대상|신청자격|참여자격)\s*[:：]\s*(.{5,200})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      const text = match[1];
      const types: string[] = [];
      if (/중소기업|기업|벤처|스타트업|창업/.test(text)) types.push('COMPANY');
      if (/연구기관|연구소|출연연/.test(text)) types.push('RESEARCH_INSTITUTE');
      if (/대학|대학교/.test(text)) types.push('UNIVERSITY');
      if (/공공기관|지자체/.test(text)) types.push('PUBLIC_INSTITUTION');
      return types.length > 0 ? types : null;
    },
    confidence: 'MEDIUM',
    description: 'Target organization types (지원대상)',
  },

  // ========================================================================
  // GROUP D: Domain & Keywords
  // ========================================================================

  // --- Primary Target Industry (NEW — basic regex) ---
  {
    field: 'primaryTargetIndustry',
    group: 'D',
    patterns: [
      // "분야 : 바이오의약" or "기술분야 : 인공지능"
      /(?:기술\s*분야|연구\s*분야|사업\s*분야|지원\s*분야)\s*[:：]\s*(.{2,40})/i,
    ],
    postProcess: (match) => {
      if (!match[1]) return null;
      return match[1].trim().split(/[,;，；]/)[0].trim();
    },
    confidence: 'MEDIUM',
    description: 'Primary target industry from field label',
  },
];

// ============================================================================
// Execution Function
// ============================================================================

/**
 * Run all Tier 1 patterns against the given text
 *
 * @param text - Full document text (announcement file or detail page)
 * @returns Array of Tier1Result for matched fields
 */
export function runTier1Extraction(text: string): Tier1Result[] {
  const results: Tier1Result[] = [];
  const matchedFields = new Set<Tier1Field>();

  for (const rule of TIER1_PATTERNS) {
    // Skip if this field was already matched by a higher-priority pattern
    if (matchedFields.has(rule.field)) continue;

    for (const pattern of rule.patterns) {
      // Reset regex state for global patterns
      pattern.lastIndex = 0;
      const match = text.match(pattern);

      if (match) {
        const value = rule.postProcess(match, text);
        if (value !== null && value !== undefined) {
          results.push({
            field: rule.field,
            group: rule.group,
            value,
            confidence: rule.confidence,
            matchedPattern: rule.description,
          });
          matchedFields.add(rule.field);
          break; // Stop trying more patterns for this rule
        }
      }
    }
  }

  return results;
}

/**
 * Get fields that were NOT extracted by Tier 1
 * Returns them grouped by field group for efficient Tier 2 batching
 */
export function getMissingFieldsByGroup(
  tier1Results: Tier1Result[]
): Record<FieldGroup, Tier1Field[]> {
  const allFields = Object.keys(FIELD_GROUP_MAP) as Tier1Field[];
  const matchedFields = new Set(tier1Results.map(r => r.field));

  const missing: Record<FieldGroup, Tier1Field[]> = { A: [], B: [], C: [], D: [] };

  for (const field of allFields) {
    if (!matchedFields.has(field)) {
      missing[FIELD_GROUP_MAP[field]].push(field);
    }
  }

  return missing;
}

/**
 * Check if a field group has any missing fields
 */
export function groupHasMissingFields(
  missing: Record<FieldGroup, Tier1Field[]>,
  group: FieldGroup
): boolean {
  return missing[group].length > 0;
}
