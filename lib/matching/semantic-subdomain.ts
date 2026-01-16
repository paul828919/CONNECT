/**
 * Semantic Sub-Domain Type Definitions
 *
 * This module defines industry-specific sub-domain structures for enhanced
 * matching precision. The current category-level matching (BIO_HEALTH, ICT, etc.)
 * groups semantically different sub-domains together, causing mismatches.
 *
 * Example Problem:
 * - BIO_HEALTH includes both human medicine AND animal medicine companies
 * - A veterinary pharma company (CTC Back) would match human vaccine programs
 *
 * Solution:
 * - Define semantic sub-domain structures per industry
 * - Use these for hard filters (block incompatible matches)
 * - Score compatible matches based on sub-domain alignment
 *
 * @see /docs/matching-quality-assessment-2026-01-16.md for analysis
 */

// ═══════════════════════════════════════════════════════════════
// BIO_HEALTH Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type TargetOrganism = 'HUMAN' | 'ANIMAL' | 'PLANT' | 'MICROBIAL' | 'MARINE';

export type BioHealthApplicationArea =
  | 'PHARMA'              // 의약품 (인체)
  | 'MEDICAL_DEVICE'      // 의료기기
  | 'DIAGNOSTICS'         // 진단
  | 'DIGITAL_HEALTH'      // 디지털 헬스케어
  | 'VETERINARY_PHARMA'   // 동물의약품
  | 'VETERINARY_DEVICE'   // 동물의료기기
  | 'BIO_MATERIAL'        // 바이오소재
  | 'COSMETICS'           // 화장품/바이오코스메틱
  | 'FOOD_HEALTH';        // 건강기능식품

export interface BioHealthSubDomain {
  targetOrganism: TargetOrganism;
  applicationArea: BioHealthApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// ICT Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type IctTargetMarket = 'CONSUMER' | 'ENTERPRISE' | 'GOVERNMENT' | 'INDUSTRIAL';

export type IctApplicationArea =
  | 'SOFTWARE'            // 소프트웨어 일반
  | 'HARDWARE'            // 하드웨어
  | 'PLATFORM'            // 플랫폼
  | 'INFRASTRUCTURE'      // 인프라
  | 'SECURITY'            // 보안
  | 'AI_ML'               // AI/머신러닝
  | 'DATA_ANALYTICS'      // 데이터 분석
  | 'CLOUD'               // 클라우드
  | 'IOT'                 // IoT
  | 'NETWORK'             // 네트워크/통신
  | 'GAMING'              // 게임
  | 'METAVERSE';          // 메타버스/XR

export interface IctSubDomain {
  targetMarket: IctTargetMarket;
  applicationArea: IctApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// MANUFACTURING Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type ManufacturingTargetIndustry =
  | 'AUTOMOTIVE'          // 자동차
  | 'AEROSPACE'           // 항공우주
  | 'ELECTRONICS'         // 전자
  | 'MATERIALS'           // 소재
  | 'MACHINERY'           // 기계
  | 'SHIPBUILDING'        // 조선
  | 'SEMICONDUCTOR'       // 반도체
  | 'DISPLAY'             // 디스플레이
  | 'ROBOTICS';           // 로봇

export type ManufacturingApplicationArea =
  | 'PARTS'               // 부품
  | 'SYSTEMS'             // 시스템
  | 'EQUIPMENT'           // 장비
  | 'MATERIALS'           // 소재
  | 'PROCESS';            // 공정

export interface ManufacturingSubDomain {
  targetIndustry: ManufacturingTargetIndustry;
  applicationArea: ManufacturingApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// ENERGY Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type EnergySource =
  | 'SOLAR'               // 태양광
  | 'WIND'                // 풍력
  | 'NUCLEAR'             // 원자력
  | 'HYDROGEN'            // 수소
  | 'BATTERY'             // 배터리/이차전지
  | 'GRID'                // 전력망
  | 'FOSSIL'              // 화석연료
  | 'GEOTHERMAL'          // 지열
  | 'HYDRO';              // 수력

export type EnergyApplicationArea =
  | 'GENERATION'          // 발전
  | 'STORAGE'             // 저장
  | 'DISTRIBUTION'        // 배전
  | 'EFFICIENCY'          // 효율
  | 'ELECTRIC_VEHICLE';   // 전기차

export interface EnergySubDomain {
  energySource: EnergySource;
  applicationArea: EnergyApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// AGRICULTURE Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type AgricultureTargetSector =
  | 'CROPS'               // 작물
  | 'LIVESTOCK'           // 축산
  | 'AQUACULTURE'         // 양식/수산
  | 'FORESTRY'            // 임업
  | 'FOOD_PROCESSING';    // 식품가공

export type AgricultureApplicationArea =
  | 'CULTIVATION'         // 재배
  | 'BREEDING'            // 육종
  | 'PROCESSING'          // 가공
  | 'DISTRIBUTION'        // 유통
  | 'SMART_FARM';         // 스마트팜

export interface AgricultureSubDomain {
  targetSector: AgricultureTargetSector;
  applicationArea: AgricultureApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// DEFENSE Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type DefenseTargetDomain =
  | 'LAND'                // 지상
  | 'NAVAL'               // 해상
  | 'AEROSPACE'           // 항공우주
  | 'CYBER'               // 사이버
  | 'SPACE';              // 우주

export type DefenseApplicationArea =
  | 'WEAPONS'             // 무기체계
  | 'SYSTEMS'             // 체계/시스템
  | 'LOGISTICS'           // 군수
  | 'C4ISR'               // 지휘통제통신
  | 'PROTECTION';         // 방호

export interface DefenseSubDomain {
  targetDomain: DefenseTargetDomain;
  applicationArea: DefenseApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT Sub-Domain Classification
// ═══════════════════════════════════════════════════════════════

export type EnvironmentTargetArea =
  | 'AIR'                 // 대기
  | 'WATER'               // 수질
  | 'SOIL'                // 토양
  | 'WASTE'               // 폐기물
  | 'CARBON'              // 탄소
  | 'ECOSYSTEM';          // 생태계

export type EnvironmentApplicationArea =
  | 'MONITORING'          // 모니터링
  | 'TREATMENT'           // 처리
  | 'PREVENTION'          // 예방
  | 'RESTORATION'         // 복원
  | 'RECYCLING';          // 재활용

export interface EnvironmentSubDomain {
  targetArea: EnvironmentTargetArea;
  applicationArea: EnvironmentApplicationArea;
}

// ═══════════════════════════════════════════════════════════════
// Union Type for All Sub-Domains
// ═══════════════════════════════════════════════════════════════

export type SemanticSubDomain =
  | BioHealthSubDomain
  | IctSubDomain
  | ManufacturingSubDomain
  | EnergySubDomain
  | AgricultureSubDomain
  | DefenseSubDomain
  | EnvironmentSubDomain;

// ═══════════════════════════════════════════════════════════════
// Industry Category to Sub-Domain Type Mapping
// ═══════════════════════════════════════════════════════════════

export const INDUSTRY_SUBDOMAIN_KEYS: Record<string, string[]> = {
  BIO_HEALTH: ['targetOrganism', 'applicationArea'],
  ICT: ['targetMarket', 'applicationArea'],
  MANUFACTURING: ['targetIndustry', 'applicationArea'],
  ENERGY: ['energySource', 'applicationArea'],
  AGRICULTURE: ['targetSector', 'applicationArea'],
  DEFENSE: ['targetDomain', 'applicationArea'],
  ENVIRONMENT: ['targetArea', 'applicationArea'],
};

// ═══════════════════════════════════════════════════════════════
// Hard Filter Configuration
// ═══════════════════════════════════════════════════════════════
// These fields trigger HARD FILTERS (complete block) if mismatched
// Other fields are used for SOFT SCORING (reduced points)

export const HARD_FILTER_FIELDS: Record<string, string[]> = {
  BIO_HEALTH: ['targetOrganism'],           // Animal company CANNOT match human program
  ICT: ['targetMarket'],                     // Enterprise CANNOT match consumer
  ENERGY: ['energySource'],                  // Battery CANNOT match nuclear
  AGRICULTURE: ['targetSector'],             // Livestock CANNOT match crops
  DEFENSE: ['targetDomain'],                 // Naval CANNOT match land
  MANUFACTURING: [],                         // No hard filters (more flexible matching)
  ENVIRONMENT: [],                           // No hard filters (more flexible matching)
};

// ═══════════════════════════════════════════════════════════════
// Mismatch Reason Codes
// ═══════════════════════════════════════════════════════════════

export type SemanticMismatchReason =
  | 'ORGANISM_MISMATCH'                      // BIO_HEALTH: human vs animal vs plant
  | 'MARKET_MISMATCH'                        // ICT: consumer vs enterprise vs government
  | 'ENERGY_SOURCE_MISMATCH'                 // ENERGY: solar vs battery vs nuclear
  | 'SECTOR_MISMATCH'                        // AGRICULTURE: crops vs livestock
  | 'DOMAIN_MISMATCH'                        // DEFENSE: land vs naval vs aerospace
  | 'NO_SEMANTIC_DATA'                       // Missing sub-domain data
  | 'SEMANTIC_MATCH'                         // Sub-domains align
  | 'PARTIAL_MATCH';                         // Some fields match

// ═══════════════════════════════════════════════════════════════
// Scoring Result Interface
// ═══════════════════════════════════════════════════════════════

export interface SemanticMatchResult {
  score: number;                             // 0-25 points
  reason: SemanticMismatchReason;
  isHardFilter: boolean;                     // If true, should completely block match
  explanation?: string;                      // Korean explanation for user
  matchingFields: string[];                  // Fields that matched
  mismatchedFields: string[];                // Fields that didn't match
}

// ═══════════════════════════════════════════════════════════════
// Korean Labels for UI Display
// ═══════════════════════════════════════════════════════════════

export const TARGET_ORGANISM_LABELS: Record<TargetOrganism, string> = {
  HUMAN: '인체',
  ANIMAL: '동물',
  PLANT: '식물',
  MICROBIAL: '미생물',
  MARINE: '해양생물',
};

export const BIO_HEALTH_APPLICATION_LABELS: Record<BioHealthApplicationArea, string> = {
  PHARMA: '의약품',
  MEDICAL_DEVICE: '의료기기',
  DIAGNOSTICS: '진단',
  DIGITAL_HEALTH: '디지털 헬스케어',
  VETERINARY_PHARMA: '동물의약품',
  VETERINARY_DEVICE: '동물의료기기',
  BIO_MATERIAL: '바이오소재',
  COSMETICS: '화장품/바이오코스메틱',
  FOOD_HEALTH: '건강기능식품',
};

export const ICT_TARGET_MARKET_LABELS: Record<IctTargetMarket, string> = {
  CONSUMER: '일반 소비자',
  ENTERPRISE: '기업 (B2B)',
  GOVERNMENT: '공공기관',
  INDUSTRIAL: '산업용',
};

export const ENERGY_SOURCE_LABELS: Record<EnergySource, string> = {
  SOLAR: '태양광',
  WIND: '풍력',
  NUCLEAR: '원자력',
  HYDROGEN: '수소',
  BATTERY: '배터리/이차전지',
  GRID: '전력망',
  FOSSIL: '화석연료',
  GEOTHERMAL: '지열',
  HYDRO: '수력',
};

export const AGRICULTURE_SECTOR_LABELS: Record<AgricultureTargetSector, string> = {
  CROPS: '작물',
  LIVESTOCK: '축산',
  AQUACULTURE: '양식/수산',
  FORESTRY: '임업',
  FOOD_PROCESSING: '식품가공',
};

export const DEFENSE_DOMAIN_LABELS: Record<DefenseTargetDomain, string> = {
  LAND: '지상',
  NAVAL: '해상',
  AEROSPACE: '항공우주',
  CYBER: '사이버',
  SPACE: '우주',
};
