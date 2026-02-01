import {
  organizations,
  funding_programs,
  ProgramStatus,
  CompanyLocation,
  CompanyScaleType,
  KoreanRegion,
} from '@prisma/client';
import { EligibilityLevel, checkEligibility } from '../eligibility';
import { classifyProgram } from '../keyword-classifier';
import { findIndustrySector, INDUSTRY_RELEVANCE } from '../taxonomy';
import { detectProgramApplicationType, isConsolidatedAnnouncement } from './program-type-detector';
import { EligibilityGateResult } from './types';

export type OrganizationWithLocations = organizations & { locations?: CompanyLocation[] };

const METROPOLITAN_REGIONS: KoreanRegion[] = ['SEOUL', 'GYEONGGI', 'INCHEON'];

const SME_REGIONAL_KEYWORD_MAP: Record<string, KoreanRegion[]> = {
  // Metropolitan (수도권)
  '서울': ['SEOUL'],
  '인천': ['INCHEON'],
  '경기': ['GYEONGGI'],
  // Non-metropolitan (비수도권)
  '부산': ['BUSAN'],
  '울산': ['ULSAN'],
  '경남': ['GYEONGNAM'],
  '대구': ['DAEGU'],
  '경북': ['GYEONGBUK'],
  '광주': ['GWANGJU'],
  '전남': ['JEONNAM'],
  '전북': ['JEONBUK'],
  '대전': ['DAEJEON'],
  '충남': ['CHUNGNAM'],
  '충북': ['CHUNGBUK'],
  '세종': ['SEJONG'],
  '강원': ['GANGWON'],
  '제주': ['JEJU'],
};

const KOREAN_TITLE_STOPWORDS = new Set([
  '및', '의', '에', '을', '를', '은', '는', '이', '가', '와', '과', '로', '등',
  '한', '된', '중', '내', '대한', '위한', '통한', '관한', '또는', '또한',
  '대응', '공고', '계획', '선정', '신규', '추진', '사업', '지원', '년도',
  '기술', '기술개발', '개발', '구축', '기반', '시행', '시스템', '연구', '연구개발',
]);

const HOSPITAL_ONLY_KEYWORDS = [
  '의사과학자',
  '상급종합병원',
  'M.D.-Ph.D.',
  '의료법',
];

const TRAINING_PROGRAM_PATTERNS = [
  /훈련/, /교육훈련/, /인재성장/, /인력양성/, /기술교육/, /직업훈련/, /교육과정/, /이론교육/,
];

const STRONG_RD_KEYWORDS = /기술개발|R&D|연구개발|과제공모|기술혁신/;

function hasNonMetropolitanLocation(organization: OrganizationWithLocations): boolean {
  if (!organization.locations || organization.locations.length === 0) {
    return false;
  }
  return organization.locations.some(loc => !METROPOLITAN_REGIONS.includes(loc.region));
}

function getOrganizationRegions(organization: OrganizationWithLocations): KoreanRegion[] {
  if (!organization.locations) return [];
  return organization.locations.map(loc => loc.region);
}

export interface EligibilityGateOptions {
  includeExpired?: boolean;
}

export function evaluateEligibilityGate(
  program: funding_programs,
  organization: OrganizationWithLocations,
  options?: EligibilityGateOptions
): EligibilityGateResult & { eligibilityLevel: EligibilityLevel } {
  const blockReasons: string[] = [];

  const applicationType = detectProgramApplicationType(program);

  if (!options?.includeExpired && program.status !== ProgramStatus.ACTIVE) {
    blockReasons.push('STATUS_INACTIVE');
  }

  if (!options?.includeExpired && program.deadline && new Date(program.deadline) < new Date()) {
    blockReasons.push('DEADLINE_PASSED');
  }

  if (isConsolidatedAnnouncement(program)) {
    blockReasons.push('CONSOLIDATED_ANNOUNCEMENT');
  }

  if (applicationType === 'DESIGNATED') {
    blockReasons.push('DESIGNATED_PROJECT');
  }

  if (applicationType === 'DEMAND_SURVEY') {
    blockReasons.push('DEMAND_SURVEY');
  }

  if (applicationType === 'INSTITUTIONAL_ONLY' && organization.type !== 'RESEARCH_INSTITUTE') {
    blockReasons.push('INSTITUTIONAL_ONLY');
  }

  const isTrainingProgram = TRAINING_PROGRAM_PATTERNS.some(pattern => pattern.test(program.title));
  const hasStrongRdKeywords = STRONG_RD_KEYWORDS.test(program.title);
  if (isTrainingProgram && !hasStrongRdKeywords && organization.type === 'COMPANY') {
    blockReasons.push('TRAINING_PROGRAM');
  }

  if (program.targetType && !program.targetType.includes(organization.type)) {
    if (!options?.includeExpired) {
      blockReasons.push('ORG_TYPE_MISMATCH');
    }
  }

  if (program.allowedBusinessStructures && program.allowedBusinessStructures.length > 0) {
    const orgBusinessStructure = organization.businessStructure;
    if (orgBusinessStructure && !program.allowedBusinessStructures.includes(orgBusinessStructure)) {
      blockReasons.push('BUSINESS_STRUCTURE_MISMATCH');
    }
    if (!orgBusinessStructure) {
      blockReasons.push('BUSINESS_STRUCTURE_UNKNOWN');
    }
  }

  const matchingTRL = organization.targetResearchTRL || organization.technologyReadinessLevel;
  if (program.minTrl !== null && program.maxTrl !== null && matchingTRL) {
    const orgTRL = matchingTRL;
    if (options?.includeExpired) {
      const relaxedMin = Math.max(1, program.minTrl - 3);
      const relaxedMax = Math.min(9, program.maxTrl + 3);
      if (orgTRL < relaxedMin || orgTRL > relaxedMax) {
        blockReasons.push('TRL_OUT_OF_RANGE');
      }
    } else {
      if (orgTRL < program.minTrl || orgTRL > program.maxTrl) {
        blockReasons.push('TRL_OUT_OF_RANGE');
      }
    }
  }

  const isHospitalOnlyProgram = HOSPITAL_ONLY_KEYWORDS.some(keyword => program.title.includes(keyword));
  if (isHospitalOnlyProgram && organization.type !== 'RESEARCH_INSTITUTE') {
    blockReasons.push('HOSPITAL_ONLY');
  }

  const eligibilityResult = checkEligibility(program, organization);
  if (eligibilityResult.level === EligibilityLevel.INELIGIBLE) {
    blockReasons.push('HARD_REQUIREMENT_FAILED');
  }

  let bypassIndustryFilterForSME = false;

  if (program.ministry === '중소벤처기업부') {
    const smeClassification = classifyProgram(program.title, null, program.ministry);

    if (smeClassification.industry !== 'GENERAL' && smeClassification.matchedKeywords.length > 0) {
      // industry-specific SME program (keep industry filter)
    } else {
      const orgScale = organization.companyScaleType;
      const orgRegions = getOrganizationRegions(organization);

      if (orgScale === 'LARGE_ENTERPRISE') {
        blockReasons.push('SME_SCALE_BLOCK');
      }

      if (
        program.title.includes('창업성장') ||
        program.title.includes('TIPS') ||
        program.title.includes('팁스') ||
        program.title.includes('디딤돌')
      ) {
        if (orgScale === 'MID_SIZED') {
          blockReasons.push('SME_STARTUP_ONLY');
        }
      }

      if (program.title.includes('지역혁신선도') || program.title.includes('지역혁신')) {
        if (!hasNonMetropolitanLocation(organization)) {
          blockReasons.push('SME_REGION_NON_METRO_ONLY');
        }
      }

      let regionCheckPassed = true;
      for (const [regionKeyword, allowedRegions] of Object.entries(SME_REGIONAL_KEYWORD_MAP)) {
        if (program.title.includes(regionKeyword)) {
          const hasMatchingRegion = orgRegions.some(r => allowedRegions.includes(r));
          if (!hasMatchingRegion && orgRegions.length > 0) {
            regionCheckPassed = false;
          }
          break;
        }
      }

      if (!regionCheckPassed) {
        blockReasons.push('SME_REGION_MISMATCH');
      }

      bypassIndustryFilterForSME = true;
    }
  }

  const orgSector = organization.industrySector ? findIndustrySector(organization.industrySector) : null;
  const programClassification = classifyProgram(program.title, null, program.ministry || null);
  let programSector: string | null = null;

  if (programClassification.industry !== 'GENERAL') {
    programSector = findIndustrySector(programClassification.industry);
  } else if (program.category) {
    programSector = findIndustrySector(program.category);
  }

  const orgWithExclusions = organization as OrganizationWithLocations & { excludedDomains?: string[] };
  if (orgWithExclusions.excludedDomains && orgWithExclusions.excludedDomains.length > 0) {
    if (programClassification.industry !== 'GENERAL' && orgWithExclusions.excludedDomains.includes(programClassification.industry)) {
      blockReasons.push('EXCLUDED_DOMAIN');
    }
  }

  if (!bypassIndustryFilterForSME && orgSector) {
    if (orgSector && programSector) {
      const relevanceScore = INDUSTRY_RELEVANCE[orgSector]?.[programSector] ?? 0;
      if (!options?.includeExpired) {
        if (relevanceScore < 0.45) {
          blockReasons.push('INDUSTRY_MISMATCH');
        }

        if (orgSector !== programSector && relevanceScore >= 0.45 && relevanceScore < 1.0) {
          const orgKeywords = [
            ...(organization.keyTechnologies || []),
            ...(organization.technologyDomainsSpecific || []),
            ...(organization.researchFocusAreas || []),
          ].map(k => k.toLowerCase());

          const programKeywords = (program.keywords || []).map(k => k.toLowerCase());
          const programTitleWords = program.title.toLowerCase().split(/\s+/)
            .filter(word => word.length >= 2 && !KOREAN_TITLE_STOPWORDS.has(word));
          const allProgramKeywords = [...programKeywords, ...programTitleWords];

          const hasKeywordOverlap = orgKeywords.some(orgK =>
            allProgramKeywords.some(progK => orgK === progK)
          );

          if (!hasKeywordOverlap && orgKeywords.length > 0) {
            blockReasons.push('CROSS_INDUSTRY_NO_KEYWORD');
          }
        }
      }
    } else if (!options?.includeExpired) {
      blockReasons.push('UNKNOWN_SECTOR');
    }
  }

  return {
    passed: blockReasons.length === 0,
    blockReasons,
    applicationType,
    eligibilityLevel: eligibilityResult.level,
    eligibilityResult,
  };
}
